from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib

root = Path(__file__).resolve().parents[1]
web = root / "public_html"
assert (web / "index.html").is_file(), "Ejecutá npm run build primero."
target = root / "deploy"
target.mkdir(exist_ok=True)
archive = target / "divisas-posadas-hostinger.zip"
with ZipFile(archive, "w", ZIP_DEFLATED, compresslevel=9) as output:
    for file in sorted(web.rglob("*")):
        if file.is_file() and file.name != "config.local.php":
            output.write(file, file.relative_to(web).as_posix())
    output.write(root / "INSTALAR_HOSTINGER.md", "INSTALAR_HOSTINGER.md")
(target / "SHA256SUMS.txt").write_text(hashlib.sha256(archive.read_bytes()).hexdigest() + "  " + archive.name + "\n")
print(f"{archive.name}: {archive.stat().st_size:,} bytes")
