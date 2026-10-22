"""Verifica el contenido REAL del ZIP público, no solo el código fuente.

Evita publicar un ZIP donde no aparezcan las mejoras de guaraníes,
tipografía móvil y el chat híbrido.
"""
from pathlib import Path
from zipfile import ZipFile
import argparse
import hashlib
import json
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
        source_files = [
            "src/lib/content.ts", "src/ui/Landing.tsx", "src/ui/Admin.tsx",
            "src/ui/ChatInbox.tsx", "src/ui/ChatWidget.tsx", "src/ui/OffersShowcase.tsx", "src/styles.css",
            "server/api/live-chat.php", "public/icons/elegi-tu-divisa.svg"
        ]
        digest = hashlib.sha256()
        for filename in source_files:
            digest.update(filename.encode("utf-8"))
            digest.update((ROOT / filename).read_bytes())
        try:
            build_meta = json.loads(info)
        except (ValueError, UnicodeDecodeError):
            build_meta = {}
        fresh = build_meta.get("buildId") == digest.hexdigest()[:16]
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
            "ofertas tipo producto antes de cotizaciones": (
                b"shop-offers-track" in js
                and b"shop-offer-card" in js
                and b"Quiero esta oferta" in js
                and b"Ofertas destacadas" in js
                and b"ofertas-tienda-antes-cotizaciones" in info
            ),
            "tarjetas de producto con carrusel": (
                compiled_rule(b".site .shop-offer-card",[b"flex:0 0 calc(33.3333% - 13.3333px)"])
                and compiled_rule(b".site .shop-offer-cta",[b"font-size:14px"])
                and b"shop-offers-track" in js
            ),
            "tarjeta por vista en celular": (
                b"@media (width<=700px)" in css
                and compiled_rule(b".site .shop-offer-card",[b"flex:0 0 100%"])
            ),
            "hero comienza acá (y datos antiguos compatibles)": (
                "comienza acá.".encode() in js
                and b"hero-gradiente-contraste-chat" in info
            ),
            "gradiente en la portada": compiled_rule(b".site .hero",[b"linear-gradient",b"radial-gradient"]),
            "sombra visible en la calculadora": compiled_rule(b".site .converter",[b"box-shadow",b"26px",b"65px"]),
            "consultas rápidas con cuatro colores": all(
                cls.encode() in css for cls in [
                    ".site .chat-quick .chat-quick-rates",
                    ".site .chat-quick .chat-quick-how",
                    ".site .chat-quick .chat-quick-hours",
                    ".site .chat-quick .chat-quick-offers"
                ]
            ),
            "WhatsApp y asesor como botones distintos": (
                b"chat-whatsapp" in js
                and b"chat-live-agent" in js
                and compiled_rule(b".site .chat-contact-actions .chat-live-agent",[b"background:"])
                and compiled_rule(b".site .chat-contact-actions .chat-whatsapp",[b"background:"])
            ),
            "marca superior: logo y nombre ampliados": (
                b"logo-y-nombre-ampliados" in info
                and compiled_rule(b".site-header .brand-icon",[b"width:72px",b"height:72px"])
                and compiled_rule(b".site-header .brand-icon .custom-logo",[b"width:62px",b"height:62px"])
                and compiled_rule(b".site-header .brand-wordmark strong",[b"font-size:clamp("])
                and compiled_rule(b".site-header .brand-wordmark small",[b"font-size:12px"])
            ),
            "cabecera móvil adaptable con chat accesible": (
                "Abrir atención por chat".encode() in js
                and compiled_rule(b".site-header .nav-links.is-open",[b"top:86px"])
                and compiled_rule(b".site-header .header-contact",[b"width:44px"])
            ),
            "FAQ azul sin antiguo panel de contacto": (
                b"faq-azul-pasos-graficos" in info
                and b"faq-panel" in js
                and b"faq-cta" in js
                and b"contact-section" not in js
                and compiled_rule(b".site .faq-panel",[b"background:linear-gradient"])
            ),
            "preguntas legibles en fondo azul": (
                compiled_rule(b".site .faq-panel .faq-list summary",[b"color:#f5f9ff"])
                and compiled_rule(b".site .faq-panel .faq-list details p",[b"color:#dbe8f7"])
            ),
            "tres pasos representados con tarjetas e íconos": (
                b"how-step-visual" in js
                and b"how-step-symbol" in js
                and b"how-step-arrow" in js
                and compiled_rule(b".site .how-section .how-step",[b"box-shadow:"])
            ),
            "pasos responsivos de una columna en celular": (
                b"@media (width<=700px)" in css
                and compiled_rule(b".site .how-section .steps",[b"grid-template-columns:1fr"])
            ),
            "ícono de divisas en líneas azules y fondo transparente": (
                "icons/elegi-tu-divisa.svg" in names
                and b"icono-lineal-elegi-divisa" in info
                and b'fill="none"' in archive.read("icons/elegi-tu-divisa.svg")
                and b'stroke="#22599B"' in archive.read("icons/elegi-tu-divisa.svg")
                and b"/icons/elegi-tu-divisa.svg" in js
                and compiled_rule(b".site .how-step-symbol .how-step-custom-icon",[b"width:37px",b"height:37px"])
            ),
            "ZIP compilado desde el último código fuente": fresh,
        }
        for name, ok in checks.items():
            print(("OK" if ok else "FALTA") + ": " + name)
        print(f"ZIP: {ZIP.stat().st_size:,} bytes, {len(names)} archivos")
        print("Identificador de versión:", build_meta.get("buildId", "no disponible"))
        missing = [name for name, ok in checks.items() if not ok]
        if missing and not args.report_only:
            print("ERROR: este ZIP NO incluye todas las mejoras solicitadas.", file=sys.stderr)
            return 1
        return 0

if __name__ == "__main__":
    raise SystemExit(main())
