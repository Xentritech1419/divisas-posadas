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
        # El optimizador CSS puede ordenar las propiedades o combinar selectores.
        # Mostrar la regla real para poder diagnosticar cualquier diferencia.
        for fragment in [b".rates-grid .rate-card-top p", b".rates-grid .rate-actions button"]:
            pos = css.find(fragment)
            print("DEBUG CSS", fragment.decode(), ":", repr(css[max(0,pos-60):pos+250]) if pos>=0 else "selector no encontrado")
        checks = {
            "HTML principal": "index.html" in names,
            "API PHP del chat": bool(php),
            "cotización ₲ por $1 (tarjeta)": "por $ 1 ARS".encode() in js,
            "edición guaraníes por $1 (administración)": "Guaraníes por $ 1 ARS".encode() in js or "Compra · ₲ por $ 1".encode() in js,
            "textos móviles agrandados (descripción)": b".site .rates-grid .rate-card-top p{font-size:12px}" in css,
            "textos móviles agrandados (botones)": b".site .rates-grid .rate-actions button{font-size:14px;min-height:50px}" in css,
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
