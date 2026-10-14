import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
await rm("public_html", { recursive: true, force: true });
await mkdir("public_html", { recursive: true });
await cp("dist", "public_html", { recursive: true });
await cp("server", "public_html", { recursive: true, filter: p => !p.endsWith("config.local.php") });
const { defaultContent } = await import("../src/lib/content.ts");
await writeFile("public_html/api/default-content.json", JSON.stringify(defaultContent, null, 2) + "\n");
// The same seed is shipped in source for local PHP development.
await writeFile("server/api/default-content.json", JSON.stringify(defaultContent, null, 2) + "\n");
console.log("Listo: public_html contiene la landing y la API PHP. Sin credenciales ni datos privados.");
