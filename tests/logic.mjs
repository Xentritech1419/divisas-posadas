import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { defaultContent, convert, activeOffers, contentSchema, botReply } from "../src/lib/content.ts";
assert(contentSchema.safeParse(defaultContent).success);
assert(defaultContent.currencies.some(c=>c.id==="usdt" && c.active===false));
assert(!defaultContent.currencies.some(c=>c.id==="paypal"));
assert.equal(convert(defaultContent,100,"usdt","ars"),0);
assert.equal(defaultContent.currencies.find(c=>c.id==="euro")?.color,"#1976D2");
const enabled=structuredClone(defaultContent);
enabled.currencies.find(c=>c.id==="usdt").active=true;
assert.equal(convert(enabled,100,"usdt","ars"),108000);
assert(!contentSchema.safeParse({...defaultContent,currencies:defaultContent.currencies.map(c=>c.id==="usdt"?{...c,id:"paypal"}:c)}).success);
assert.equal(convert(defaultContent, 100, "azul", "ars"), 120000);
assert.equal(convert(defaultContent, 124000, "ars", "azul"), 100);
assert.equal(convert(defaultContent, 1000000, "guarani", "ars"), 155000);
assert(Math.abs(convert(defaultContent, 170000, "ars", "guarani") - 1000000) < 0.001);
const paused = structuredClone(defaultContent); paused.currencies[0].active = false;
assert.equal(convert(paused, 100, "azul", "ars"), 0);
const expired = structuredClone(defaultContent); expired.offers[0].expiresAt = "2000-01-01T00:00:00Z";
assert.equal(activeOffers(expired).length, 1);
assert.match(botReply(defaultContent, "cotización guaraní"), /0,155/);
assert.match(botReply(defaultContent, "cotización guaraní"), /ejemplo/);
assert.equal(convert(defaultContent, Infinity, "azul", "ars"), 0);
// Evita regresar accidentalmente a dos columnas en celulares.
const css=readFileSync(new URL("../src/styles.css",import.meta.url),"utf8");
assert.match(css,/\.rates-grid\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
assert.match(css,/@media\(max-width:900px\)\{[\s\S]*?\.rates-grid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}/);
assert.match(css,/@media \(max-width:700px\)\{\s*\.rates-grid\{\s*grid-template-columns:minmax\(0,1fr\)/);
assert.match(css,/\.rates-grid \.rate-actions button\{[\s\S]*?min-height:48px;/);
// El avatar del chat debe ser el ícono con fondo blanco, no la flecha
// transparente que pierde contraste sobre la cabecera azul oscuro.
const brandComponent=readFileSync(new URL("../src/ui/Brand.tsx",import.meta.url),"utf8");
assert.match(brandComponent,/src="\\/logo-asistente-divisas-posadas\\.svg"/);
const assistantAvatar=readFileSync(new URL("../public/logo-asistente-divisas-posadas.svg",import.meta.url),"utf8");
assert.match(assistantAvatar,/<rect[^>]+fill="#FFFFFF"[^>]+stroke="#DCE8EE"/);
assert.match(assistantAvatar,/<path fill="#18E5C1"/);
assert.match(assistantAvatar,/<path fill="#2C3768"/);
console.log("Compra, venta, guaraní, pausa, vencimiento y asistente verificados.");
