"""Verifica el contenido REAL del ZIP público, no solo el código fuente.

Evita publicar un ZIP donde no aparezcan las mejoras de guaraníes,
tipografía móvil y el chat híbrido.
"""
from pathlib import Path
from zipfile import ZipFile
import argparse
import sys

ROOT = Path(__file__).resolve().parents[1]
ZIP = ROOT / "deploy/divisas-posadas-hostinger.zip"

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--report-only", action="store_true", help="Solo informa sobre el ZIP ya versionado en GitHub")
    args = parser.parse_args()
    if not ZIP.is_file():
        print("No existe ZIP versionado todavía.")
        return 0 if args.report_only else 1

    with ZipFile(ZIP) as archive:
        names = set(archive.namelist())
        js = b"\n".join(archive.read(p) for p in names if p.startswith("assets/") and p.endswith(".js"))
        css = b"\n".join(archive.read(p) for p in names if p.startswith("assets/") and p.endswith(".css"))
        php = archive.read("api/live-chat.php") if "api/live-chat.php" in names else b""
        info = archive.read("build-info.json") if "build-info.json" in names else b""
        # El optimizador de Vite combina selectores y reordena declaraciones.
        # Verificamos las propiedades por regla en lugar de exigir bytes idénticos.
        def compiled_rule(selector: bytes, properties: list[bytes]) -> bool:
            for rule in css.split(b"}"):
                if b"{" not in rule:
                    continue
                head, body = rule.rsplit(b"{", 1)
                selectors = [s.strip() for s in head.rsplit(b"}",1)[-1].split(b",")]
                if selector in selectors and all(prop in body for prop in properties):
                    return True
            return False
        checks = {
            "HTML principal": "index.html" in names,
            "API PHP del chat": bool(php),
            "cotización ₲ por $1 (tarjeta)": "por $ 1 ARS".encode() in js,
            "edición guaraníes por $1 (administración)": "Guaraníes por $ 1 ARS".encode() in js or "Compra · ₲ por $ 1".encode() in js,
            "textos móviles agrandados (descripción)": compiled_rule(b".site .rates-grid .rate-card-top p",[b"font-size:12px"]),
            "textos móviles agrandados (botones)": compiled_rule(b".site .rates-grid .rate-actions button",[b"font-size:14px",b"min-height:50px"]),
            "chat confirma estado en Hostinger": b"Confirmando con Hostinger" in js,
            "chat renueva la presencia": b"CHAT_OPERATOR_TTL=120" in php,
            "versión identificable": b'"features"' in info,
        }
        for name, ok in checks.items():
            print(("OK" if ok else "FALTA") + ": " + name)
        print(f"ZIP: {ZIP.stat().st_size:,} bytes, {len(names)} archivos")
        missing = [name for name, ok in checks.items() if not ok]
        if missing and not args.report_only:
            print("ERROR: este ZIP NO incluye todas las mejoras solicitadas.", file=sys.stderr)
            return 1
        return 0

if __name__ == "__main__":
    raise SystemExit(main())
