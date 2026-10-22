import { createHash } from "node:crypto";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
await rm("public_html", { recursive: true, force: true });
await mkdir("public_html", { recursive: true });
await cp("dist", "public_html", { recursive: true });
await cp("server", "public_html", { recursive: true, filter: p => !p.endsWith("config.local.php") });
// Identificador reproducible del código que se empaqueta: sirve para detectar
// diferencias entre GitHub y una instalación antigua o cacheada en Hostinger.
const sourceFiles=[
  "src/lib/content.ts","src/ui/Landing.tsx","src/ui/Admin.tsx",
  "src/ui/ChatInbox.tsx","src/ui/ChatWidget.tsx","src/ui/OffersShowcase.tsx","src/styles.css",
  "server/api/live-chat.php"
];
const hash=createHash("sha256");
for(const name of sourceFiles){
  hash.update(name);
  hash.update(await readFile(name));
}
const buildId=hash.digest("hex").slice(0,16);
await writeFile("public_html/build-info.json",JSON.stringify({
  buildId,
  features:["guaranies-por-peso","textos-movil-ampliados","chat-en-vivo-confirmado","ofertas-tienda-antes-cotizaciones"],
  description:"Divisas Posadas: versión compilada para Hostinger"
},null,2));
const { defaultContent } = await import("../src/lib/content.ts");
await writeFile("public_html/api/default-content.json", JSON.stringify(defaultContent, null, 2) + "\n");
// The same seed is shipped in source for local PHP development.
await writeFile("server/api/default-content.json", JSON.stringify(defaultContent, null, 2) + "\n");
console.log("Listo: public_html contiene la landing y la API PHP. Sin credenciales ni datos privados.");
