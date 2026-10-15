"""Prueba real de PHP con datos y cuenta temporales; no toca una instalación existente."""
import base64
import copy
import http.cookiejar
import json
import os
from pathlib import Path
import secrets
import shutil
import signal
import socket
import subprocess
import tempfile
import time
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
PHP = os.environ.get("PHP_BIN", "php")
assert shutil.which(PHP), "Instalá PHP CLI 8.3 o superior para ejecutar esta prueba."
assert (ROOT / "public_html/index.html").exists(), "Ejecutá npm run build antes de las pruebas."


class Client:
    def __init__(self, origin):
        self.origin = origin
        self.jar = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.jar))
        self.csrf = None

    def request(self, path, method="GET", value=None, headers=None, raw=None, csrf=True):
        extra = {"Origin": self.origin}
        if method != "GET" and self.csrf and csrf:
            extra["X-CSRF-Token"] = self.csrf
        if value is not None:
            raw = json.dumps(value).encode()
            extra["Content-Type"] = "application/json"
        extra.update(headers or {})
        req = urllib.request.Request(self.origin + path, data=raw, method=method, headers=extra)
        try:
            response = self.opener.open(req, timeout=10)
        except urllib.error.HTTPError as error:
            response = error
        data = response.read()
        try:
            data = json.loads(data)
        except (json.JSONDecodeError, UnicodeDecodeError):
            pass
        return response.status, data, response.headers

    def session(self):
        code, data, headers = self.request("/api/session")
        assert code == 200, (code, data)
        self.csrf = data["csrf"]
        return data, headers


with tempfile.TemporaryDirectory(prefix="divisas-php-test-") as temp:
    work = Path(temp)
    web = work / "public_html"
    shutil.copytree(ROOT / "public_html", web)
    setup_key = secrets.token_hex(24)
    (web / "config.local.php").write_text("<?php return ['setup_key' => '" + setup_key + "'];")
    with socket.socket() as port_socket:
        port_socket.bind(("127.0.0.1", 0))
        port = port_socket.getsockname()[1]
    origin = f"http://127.0.0.1:{port}"
    log = (work / "php.log").open("w+")
    (work / "sessions").mkdir()

    def start():
        process = subprocess.Popen([PHP, "-d", "session.save_path=" + str(work / "sessions"), "-S", f"127.0.0.1:{port}", "-t", str(web), str(ROOT / "scripts/dev-router.php")], stdout=log, stderr=log, start_new_session=True)
        for _ in range(80):
            try:
                with urllib.request.urlopen(origin + "/api/content", timeout=1) as response:
                    if response.status == 200:
                        return process
            except (urllib.error.URLError, TimeoutError):
                time.sleep(0.05)
        process.terminate()
        log.seek(0)
        raise AssertionError(log.read())

    def stop(process):
        os.killpg(process.pid, signal.SIGTERM)
        process.wait(timeout=5)

    process = start()
    try:
        admin = Client(origin)
        visitor = Client(origin)
        code, initial, _ = admin.request("/api/content")
        assert code == 200 and initial["revision"] == 0 and initial["content"]["demo"]
        assert len(initial["content"]["currencies"]) == 6
        ids = [c["id"] for c in initial["content"]["currencies"]]
        assert "usdt" in ids and "paypal" not in ids
        assert initial["content"]["currencies"][-1]["active"] is False
        assert initial["content"]["currencies"][2]["color"] == "#1976D2"
        assert initial["content"]["offers"][-1]["active"] is False
        for coin in ["usd", "eur", "usdt"]:
            code, asset, headers = visitor.request(f"/icons/{coin}.svg")
            assert code == 200 and b"<svg" in asset
        assert initial["content"]["brand"]["logoUrl"] == "/logo-divisas-posadas.svg"
        assert initial["content"]["brand"]["primary"] == "#18E5C1"
        assert initial["content"]["brand"]["dark"] == "#2C3768"
        assert visitor.request("/logo-divisas-posadas.svg")[0] == 200
        assert visitor.request("/favicon.svg")[0] == 200
        assert initial["content"]["contact"]["whatsapp"] == "5493764271559"
        assert visitor.request("/api/content", "PUT", initial)[0] == 401
        assert visitor.request("/api/backup")[0] == 401
        assert visitor.request("/api/users")[0] == 401
        assert visitor.request("/api/upload", "POST", {})[0] == 401
        state, headers = admin.session()
        assert state["setupEnabled"] and not state["configured"]
        cookie = headers.get("Set-Cookie", "").lower()
        assert "httponly" in cookie and "samesite=strict" in cookie
        fields = {"setupKey": setup_key, "email": "owner@example.test", "displayName": "Prueba", "password": "Only-for-this-test!42"}
        assert admin.request("/api/setup", "POST", fields, csrf=False)[0] == 403
        assert admin.request("/api/setup", "POST", {**fields, "setupKey": "wrong"})[0] == 403
        assert admin.request("/api/setup", "POST", fields)[0] == 201
        state, _ = admin.session()
        assert state["user"]["email"] == fields["email"] and state["configured"]
        assert state["user"]["role"] == "owner"
        assert admin.request("/api/setup", "POST", fields)[0] == 409
        payload = {"content": copy.deepcopy(initial["content"]), "revision": 0}
        payload["content"]["currencies"][4]["buy"] = 0.180
        assert admin.request("/api/content", "PUT", payload, csrf=False)[0] == 403
        assert admin.request("/api/content", "PUT", payload, headers={"Origin": "https://foreign.example"})[0] == 403
        broken = copy.deepcopy(payload)
        broken["content"]["currencies"][4]["buy"] = 0
        assert admin.request("/api/content", "PUT", broken)[0] == 400
        broken = copy.deepcopy(payload)
        broken["content"]["brand"]["logoUrl"] = "javascript:alert(1)"
        assert admin.request("/api/content", "PUT", broken)[0] == 400
        broken = copy.deepcopy(payload)
        broken["content"]["contact"]["whatsapp"] = "123"
        assert admin.request("/api/content", "PUT", broken)[0] == 400
        code, saved, _ = admin.request("/api/content", "PUT", payload)
        assert code == 200 and saved["revision"] == 1, (code, saved)
        assert admin.request("/api/content", "PUT", payload)[0] == 409
        assert visitor.request("/api/content")[1]["content"]["currencies"][4]["buy"] == 0.180
        assert admin.request("/api/backup")[1]["revision"] == 1
        assert (work / "divisas-posadas-data/content-backup.json").is_file()
        accounts = json.loads((work / "divisas-posadas-data/admins.json").read_text())
        credentials = accounts["users"][0]
        assert "password" not in credentials and credentials["passwordHash"] != fields["password"]
        code, listed, _ = admin.request("/api/users")
        assert code == 200 and len(listed["users"]) == 1
        assert admin.request("/api/users/" + listed["users"][0]["id"], "DELETE")[0] == 400
        teammate = {"email": "team@example.test", "displayName": "Equipo", "password": "Another-test-pass!42"}
        code, created, _ = admin.request("/api/users", "POST", teammate)
        assert code == 201 and created["user"]["email"] == teammate["email"]
        second = Client(origin)
        second.session()
        assert second.request("/api/login", "POST", teammate)[0] == 200
        assert second.session()[0]["user"]["email"] == teammate["email"]
        assert second.session()[0]["user"]["role"] == "editor"
        assert second.request("/api/backup")[0] == 200
        assert second.request("/api/users")[0] == 403
        assert second.request("/api/users", "POST", teammate)[0] == 403
        assert second.request("/api/users/" + created["user"]["id"], "DELETE")[0] == 403
        assert admin.request("/api/users/" + created["user"]["id"], "DELETE")[0] == 200
        assert second.session()[0]["user"] is None
        assert visitor.request("/api/admin.json")[0] == 404
        assert visitor.request("/config.local.php")[0] == 403

        def upload(image, filename):
            boundary = "----testboundary"
            body = (f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="{filename}"\r\nContent-Type: image/png\r\n\r\n'.encode() + image + f"\r\n--{boundary}--\r\n".encode())
            return admin.request("/api/upload", "POST", raw=body, headers={"Content-Type": f"multipart/form-data; boundary={boundary}"})

        assert upload(b'<svg onload="alert(1)"></svg>', "logo.png")[0] == 400
        png = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=")
        code, uploaded, _ = upload(png, "logo.png")
        assert code == 201, (code, uploaded)
        code, downloaded, headers = visitor.request(uploaded["url"])
        assert code == 200 and downloaded == png and headers.get("Content-Type") == "image/png"
        assert admin.request("/api/logout", "POST")[0] == 200
        assert admin.request("/api/content", "PUT", payload)[0] == 401
        admin.session()
        assert admin.request("/api/login", "POST", {"email": fields["email"], "password": "wrong"})[0] == 401
        assert admin.request("/api/login", "POST", fields)[0] == 200
        assert admin.session()[0]["user"] is not None

        # Simular una instalación antigua, con colores previos y su cuenta única.
        directory = work / "divisas-posadas-data"
        old_state = json.loads((directory / "content.json").read_text())
        old_state["content"]["brand"]["logoUrl"] = ""
        old_state["content"]["brand"]["primary"] = "#087F65"
        old_state["content"]["brand"]["dark"] = "#132E32"
        # Simular una instalación activa con PayPal personalizado para comprobar que
        # los precios se conservan pero no se anuncian incorrectamente como USDT.
        old_state["content"]["currencies"][2]["color"] = "#7360B4"
        legacy_coin = old_state["content"]["currencies"][-1]
        legacy_coin.update({"id": "paypal", "name": "PayPal", "code": "USD",
                            "symbol": "US$", "description": "Mi saldo PayPal",
                            "buy": 1456, "sell": 1589, "color": "#247CB2",
                            "active": True})
        old_state["content"]["offers"][-1].update({"id": "oferta-paypal", "title": "De PayPal a pesos",
                                                     "from": "paypal", "active": True})
        old_state["content"]["faqs"][2].update({"id": "paypal", "question": "¿Saldo PayPal?",
                                                   "answer": "Consultá saldo PayPal", "keywords": "paypal"})
        old_state["content"]["copy"]["heroDescription"] = "Un cambio con PayPal y otras divisas."
        (directory / "content.json").write_text(json.dumps(old_state))
        old_account = {field: credentials[field] for field in ("email", "displayName", "passwordHash", "version")}
        (directory / "admin.json").write_text(json.dumps(old_account))
        (directory / "admins.json").unlink()
        stop(process)
        process = start()
        current_state = visitor.request("/api/content")[1]
        assert current_state["revision"] == 2
        assert current_state["content"]["brand"]["logoUrl"] == "/logo-divisas-posadas.svg"
        assert current_state["content"]["brand"]["primary"] == "#18E5C1"
        assert current_state["content"]["brand"]["dark"] == "#2C3768"
        assert current_state["content"]["currencies"][4]["buy"] == 0.180
        assert current_state["content"]["currencies"][2]["color"] == "#1976D2"
        usdt = current_state["content"]["currencies"][-1]
        assert usdt["id"] == "usdt" and usdt["code"] == "USDT"
        assert usdt["buy"] == 1456 and usdt["sell"] == 1589
        assert usdt["active"] is False
        assert current_state["content"]["offers"][-1]["from"] == "usdt"
        assert current_state["content"]["offers"][-1]["active"] is False
        assert current_state["content"]["faqs"][2]["id"] == "usdt"
        assert "PayPal" not in json.dumps(current_state["content"], ensure_ascii=False)
        assert visitor.request("/api/content")[1]["revision"] == 2
        backup = json.loads((directory / "content-backup.json").read_text())
        assert backup["content"]["currencies"][-1]["id"] == "paypal"
        assert visitor.request(uploaded["url"])[1] == png
        assert visitor.session()[0]["configured"]
        migrated = json.loads((directory / "admins.json").read_text())
        assert len(migrated["users"]) == 1 and migrated["users"][0]["email"] == fields["email"]
        assert migrated["users"][0]["role"] == "owner"
        admin.session()
        assert admin.request("/api/login", "POST", fields)[0] == 200
        active_usdt = copy.deepcopy(current_state)
        active_usdt["content"]["currencies"][-1].update({
            "buy": 1500, "sell": 1575, "active": True, "description": "USDT verificado"})
        save_code, save_body, _ = admin.request("/api/content", "PUT", active_usdt)
        assert save_code == 200, (save_code, save_body)
        live_usdt = visitor.request("/api/content")[1]
        assert live_usdt["revision"] == 3
        assert live_usdt["content"]["currencies"][-1]["buy"] == 1500
        assert live_usdt["content"]["currencies"][-1]["active"] is True
        for _ in range(10):
            code, _, _ = visitor.request("/api/login", "POST", {"email": fields["email"], "password": "wrong"})
        assert code == 429, code
        print("API PHP verificada: USDT, íconos, migración de PayPal segura, múltiples administradores, CSRF, cotizaciones persistentes y respaldo.")
    except Exception:
        log.flush()
        log.seek(0)
        print(log.read()[-4000:])
        raise
    finally:
        stop(process)
        log.close()
