import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { defaultContent, convert, activeOffers, contentSchema, botReply, guaraniesPorPeso, guaraniesPorPesoFormato, guaraniesPorPesoEditor, arsPorGuarani } from "../src/lib/content.ts";
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
assert.equal(guaraniesPorPeso(0.155),1/0.155);
assert.equal(guaraniesPorPesoFormato(0.155),"6,45");
assert.equal(guaraniesPorPesoFormato(0.170),"5,88");
assert.equal(guaraniesPorPesoEditor(0.155),6.45);
assert.equal(guaraniesPorPesoEditor(0.170),5.88);
assert.equal(arsPorGuarani(0),0);
assert.equal(guaraniesPorPeso(0),0);
assert.equal(guaraniesPorPeso(Number.POSITIVE_INFINITY),0);
assert(Math.abs(arsPorGuarani(6.45)-(1/6.45))<1e-12);
const personalized=structuredClone(defaultContent);
personalized.currencies.find(c=>c.id==="guarani").buy=arsPorGuarani(6.45);
personalized.currencies.find(c=>c.id==="guarani").sell=arsPorGuarani(5.88);
assert(contentSchema.safeParse(personalized).success);
assert(Math.abs(convert(personalized,6.45,"guarani","ars")-1)<1e-10);
assert(Math.abs(convert(personalized,1,"ars","guarani")-5.88)<1e-10);
assert.match(botReply(defaultContent,"cotización guaraní"),/₲ 6,45 por \$ 1 ARS/);
assert.match(botReply(defaultContent,"cotización guaraní"),/₲ 5,88 por \$ 1 ARS/);
assert.match(botReply(defaultContent,"precio dólar azul"),/1[.]200/);
assert.match(botReply(defaultContent, "cotización guaraní"), /ejemplo/);
assert.equal(convert(defaultContent, Infinity, "azul", "ars"), 0);
// La cotización PYG/ARS debe aparecer tanto en la web como en el panel.
const landingSource=readFileSync(new URL("../src/ui/Landing.tsx",import.meta.url),"utf8");
const adminSource=readFileSync(new URL("../src/ui/Admin.tsx",import.meta.url),"utf8");
assert(landingSource.includes("x.id===\"guarani\"?guaraniesPorPesoFormato(x.buy)"));
assert(landingSource.includes("x.id===\"guarani\"?guaraniesPorPesoFormato(x.sell)"));
assert(landingSource.includes('className="guarani-unit"'));
assert(adminSource.includes('guaraniesPorPesoEditor(cur.buy)'));
assert(adminSource.includes('arsPorGuarani(Number(v))'));
// Evita regresar accidentalmente a dos columnas en celulares.
const css=readFileSync(new URL("../src/styles.css",import.meta.url),"utf8");
assert.match(css,/\.rates-grid\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
assert.match(css,/@media\(max-width:900px\)\{[\s\S]*?\.rates-grid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}/);
assert.match(css,/@media \(max-width:700px\)\{\s*\.rates-grid\{\s*grid-template-columns:minmax\(0,1fr\)/);
assert.match(css,/\.rates-grid \.rate-actions button\{[\s\S]*?min-height:48px;/);
// Los textos menores (entre 8 y 10px en la versión original) deben ser
// legibles en celulares sin convertir la grilla nuevamente en dos columnas.
assert.match(css,/\/\* Legibilidad: microtextos más cómodos/);
assert.match(css,/\.site \.rates-grid \.rate-card-top p\{font-size:11px;/);
assert.match(css,/\.site \.rates-grid \.rate-values span\{font-size:11px;/);
assert.match(css,/\.site \.rates-currency\{font-size:12px;/);
assert.match(css,/@media\(max-width:700px\)\{[\s\S]*?\.site \.rates-grid \.rate-card-top p\{font-size:12px\}/);
assert.match(css,/\.site \.rates-grid \.rate-values span\{font-size:12px\}/);
assert.match(css,/\.site \.rates-grid \.rate-actions button\{font-size:14px;min-height:50px\}/);
assert.match(css,/\.site \.converter-field label\{font-size:13px\}/);
assert.match(css,/\.site \.chat-form input\{font-size:14px\}/);

// El avatar del chat debe ser el ícono con fondo blanco, no la flecha
// transparente que pierde contraste sobre la cabecera azul oscuro.
const brandComponent=readFileSync(new URL("../src/ui/Brand.tsx",import.meta.url),"utf8");
assert(brandComponent.includes('src="/logo-asistente-divisas-posadas.svg"'));
const assistantAvatar=readFileSync(new URL("../public/logo-asistente-divisas-posadas.svg",import.meta.url),"utf8");
assert.match(assistantAvatar,/<rect[^>]+fill="#FFFFFF"[^>]+stroke="#DCE8EE"/);
assert.match(assistantAvatar,/<path fill="#18E5C1"/);
assert.match(assistantAvatar,/<path fill="#2C3768"/);
// La presencia del operador debe confirmarse en Hostinger. Ocultar la pestaña
// no lo desconecta inmediatamente, y navegar por otras secciones no desmonta el chat.
const inbox=readFileSync(new URL("../src/ui/ChatInbox.tsx",import.meta.url),"utf8");
const admin=readFileSync(new URL("../src/ui/Admin.tsx",import.meta.url),"utf8");
const widget=readFileSync(new URL("../src/ui/ChatWidget.tsx",import.meta.url),"utf8");
assert(inbox.includes('const confirmed=await updatePresence(next)'));
assert(inbox.includes('setAvailable(next);'));
assert(inbox.includes('disabled={presenceBusy}'));
assert(inbox.includes('presenceQueue.current=task.then'));
assert(!inbox.includes("heartbeat(!document.hidden)"));
assert(inbox.includes('if(!document.hidden)void renew()'));
assert(admin.includes('<div hidden={tab!=="messages"}><ChatInbox/></div>'));
assert(widget.includes('open?5000:15000'));

// Ofertas tipo producto: se ven antes de cotizaciones, mantienen la selección
// de oferta real en el conversor y una sola tarjeta por vista en el celular.
const showcaseSource=readFileSync(new URL("../src/ui/OffersShowcase.tsx",import.meta.url),"utf8");
assert(landingSource.indexOf("<OffersShowcase content={c} offers={offers} onSelect={selectOffer}/>") <
  landingSource.indexOf('id="cotizaciones"'));
assert(landingSource.indexOf('["Ofertas","#ofertas"]') < landingSource.indexOf('["Cotizaciones","#cotizaciones"]'));
assert(!landingSource.includes('className="offer-card"'));
assert(showcaseSource.includes('id="ofertas"'));
assert(showcaseSource.includes('className="shop-offers-track"'));
assert(showcaseSource.includes('className="shop-offer-card"'));
assert(showcaseSource.includes('onClick={()=>onSelect(offer)}'));
assert(showcaseSource.includes('const gain=usual>0?(offer.receive/usual-1)*100:0'));
assert(showcaseSource.includes('gain>0.05'));
assert(showcaseSource.includes('offer.expiresAt'));
assert.match(css, /\.site \.shop-offer-card\{[\s\S]*?flex:0 0 calc\(\(100% - 40px\)\/3\)/);
assert.match(css, /@media\(max-width:1050px\)\{\s*\.site \.shop-offer-card\{flex-basis:calc\(\(100% - 20px\)\/2\)/);
assert.match(css, /@media\(max-width:700px\)\{[\s\S]*?\.site \.shop-offer-card\{flex:0 0 100%/);
assert.match(css, /\.site \.shop-offer-cta\{[\s\S]*?font-size:14px/);
// Mejoras de accesibilidad y estilo solicitadas para portada y chat.
assert.equal(defaultContent.copy.heroAccent,"comienza acá.");
assert(landingSource.includes('c.copy.heroAccent.trim().toLocaleLowerCase("es-AR")==="empieza acá."?"comienza acá.":c.copy.heroAccent'));
assert(css.includes("/* Hero y chat accesibles:"));
assert.match(css,/\.site \.hero\{[\s\S]*?radial-gradient\([\s\S]*?linear-gradient/);
assert.match(css,/\.site \.hero-grid\{\s*padding-top:38px/);
assert.match(css,/\.site \.hero-copy\{transform:translateY\(-17px\)/);
assert.match(css,/\.site \.converter\{[\s\S]*?box-shadow:0 26px 65px/);
assert.match(css,/\.site \.hero-description\{[\s\S]*?font-size:clamp\(16px,1\.6vw,19px\)/);
assert.match(css,/\.site \.chat-quick\{\s*display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
for(const name of ["rates","how","hours","offers"]){
  assert(widget.includes(`chat-quick-${name}`));
  assert(css.includes(`.site .chat-quick .chat-quick-${name}`));
}
assert(widget.includes('className="chat-human chat-live-agent"'));
assert(widget.includes('className="chat-human chat-whatsapp"'));
assert(widget.includes('<Headset size={20}'));
assert(widget.includes('<MessageCircleMore size={20}'));
assert(css.includes('.site .chat-contact-actions .chat-live-agent'));
assert(css.includes('.site .chat-contact-actions .chat-whatsapp'));
assert(css.includes('.site .live-chat-privacy'));
console.log("Compra, venta, guaraní, pausa, vencimiento y asistente verificados.");
