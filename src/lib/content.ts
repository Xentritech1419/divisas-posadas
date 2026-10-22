import { z } from "zod";
export const currencyIds = ["azul", "verde", "euro", "real", "guarani", "usdt"] as const;
export type CurrencyId = typeof currencyIds[number];
const currencyId = z.enum(currencyIds);
const exchangeId = z.enum(["ars", ...currencyIds]);
const short = z.string().trim().min(1).max(180);
const text = z.string().trim().min(1).max(1600);
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const date = z.union([z.literal(""), z.string().datetime()]);
export const brandLogoUrl = "/logo-divisas-posadas.svg";
export const brandPalette = {primary:"#18E5C1",dark:"#2C3768"} as const;
export const contentSchema = z.object({
  demo: z.boolean(),
  brand: z.object({name:short, tagline:short, logoUrl:z.string().max(200).refine(v=>v===""||v===brandLogoUrl||/^\/api\/media\/[a-zA-Z0-9_-]+\.(png|jpg|webp)$/.test(v)),primary:hex,dark:hex}),
  copy: z.object({eyebrow:short,heroTitle:short,heroAccent:short,heroDescription:text,ratesTitle:short,ratesDescription:text,offersTitle:short,offersDescription:text,howTitle:short,contactTitle:short,contactDescription:text,disclaimer:text}),
  contact:z.object({whatsapp:z.string().trim().refine(v=>v===""||/^[1-9]\d{7,14}$/.test(v),"Ingresá el número con código de país, solo dígitos."),location:short,address:z.string().trim().max(250),hours:short,email:z.union([z.literal(""),z.string().trim().email().max(200)])}),
  currencies:z.array(z.object({id:currencyId,name:short,code:z.string().trim().min(1).max(12),symbol:z.string().trim().min(1).max(5),description:short,buy:z.number().positive().max(1e9),sell:z.number().positive().max(1e9),color:hex,active:z.boolean()})).length(6).refine(v=>new Set(v.map(c=>c.id)).size===6,"Las divisas no pueden repetirse."),
  offers:z.array(z.object({id:z.string().min(1).max(80),title:short,description:z.string().trim().max(250),from:exchangeId,to:exchangeId,amount:z.number().positive().max(1e12),receive:z.number().positive().max(1e12),active:z.boolean(),expiresAt:date}).refine(v=>v.from!==v.to,{message:"Elegí dos monedas distintas.",path:["to"]})).max(20).refine(v=>new Set(v.map(o=>o.id)).size===v.length,"Las ofertas no pueden repetirse."),
  steps:z.array(z.object({title:short,description:text})).length(3),
  faqs:z.array(z.object({id:z.string().min(1).max(80),question:short,answer:text,keywords:z.string().max(300)})).min(1).max(20),
  bot:z.object({name:short,welcome:text,fallback:text}),
});
export type SiteContent=z.infer<typeof contentSchema>;
export type Currency=SiteContent["currencies"][number];
export type Offer=SiteContent["offers"][number];
export type ExchangeId=CurrencyId|"ars";
export type ContentState={content:SiteContent;revision:number;updatedAt:string|null};
export const defaultContent:SiteContent={
  demo:true,
  brand:{name:"Divisas Posadas",tagline:"Tu cambio, más cerca.",logoUrl:brandLogoUrl,primary:brandPalette.primary,dark:brandPalette.dark},
  copy:{eyebrow:"DIVISAS EN POSADAS, MISIONES",heroTitle:"Tu próximo cambio,",heroAccent:"comienza acá.",heroDescription:"Dólares, euros, reales, guaraníes y saldo USDT. Consultá las cotizaciones, hacé tus cuentas y coordiná con nosotros.",ratesTitle:"Cada divisa. Todo claro.",ratesDescription:"Compará nuestros valores de compra y venta: guaraníes por cada peso argentino y las demás divisas en pesos.",offersTitle:"Un buen cambio empieza con una oferta.",offersDescription:"Encontrá una propuesta para vos y consultá su disponibilidad.",howTitle:"Cambiar, así de simple.",contactTitle:"Hablemos de tu próximo cambio.",contactDescription:"¿Viajás, necesitás divisas o querés cambiar tu saldo USDT? Contanos qué necesitás y coordinamos los detalles.",disclaimer:"Las cotizaciones son orientativas y están sujetas a confirmación, disponibilidad y condiciones de la operación. El conversor no reserva una cotización ni realiza transferencias."},
  contact:{whatsapp:"5493764271559",location:"Posadas, Misiones",address:"",hours:"Consultá nuestros horarios de atención",email:""},
  currencies:[
    {id:"azul",name:"Dólar Azul",code:"USD",symbol:"US$",description:"Efectivo · Dólar Azul",buy:1200,sell:1240,color:"#3269C4",active:true},
    {id:"verde",name:"Dólar Verde",code:"USD",symbol:"US$",description:"Efectivo · Dólar Verde",buy:1180,sell:1220,color:"#198458",active:true},
    {id:"euro",name:"Euro",code:"EUR",symbol:"€",description:"Efectivo · Unión Europea",buy:1340,sell:1400,color:"#1976D2",active:true},
    {id:"real",name:"Reales",code:"BRL",symbol:"R$",description:"Efectivo · Brasil",buy:215,sell:230,color:"#A57916",active:true},
    {id:"guarani",name:"Guaraní",code:"PYG",symbol:"₲",description:"Efectivo · Paraguay",buy:0.155,sell:0.170,color:"#AF5160",active:true},
    {id:"usdt",name:"USDT (Tether)",code:"USDT",symbol:"USDT",description:"Activo digital · Tether",buy:1080,sell:1190,color:"#0C9D85",active:false},
  ],
  offers:[
    {id:"oferta-azul",title:"Tus dólares rinden más",description:"Cotización especial para este monto.",from:"azul",to:"ars",amount:500,receive:612500,active:true,expiresAt:""},
    {id:"oferta-real",title:"Tu próxima escapada",description:"Una propuesta para viajar a Brasil.",from:"ars",to:"real",amount:225000,receive:1000,active:true,expiresAt:""},
    {id:"oferta-usdt",title:"De USDT a pesos",description:"Consultá las condiciones para USDT.",from:"usdt",to:"ars",amount:200,receive:222000,active:false,expiresAt:""},
  ],
  steps:[{title:"Elegí tu divisa",description:"Revisá las cotizaciones y calculá cuánto entregás y cuánto recibís."},{title:"Escribinos",description:"Mandanos tu consulta por WhatsApp para confirmar la cotización y la disponibilidad."},{title:"Coordiná tu cambio",description:"Acordamos el monto, la modalidad y los detalles de la operación con vos."}],
  faqs:[
    {id:"cotizacion",question:"¿La cotización del conversor es definitiva?",answer:"El conversor calcula un valor orientativo con las cotizaciones publicadas. Confirmá el monto final y la disponibilidad con nuestro equipo antes de operar.",keywords:"cotizacion,cotización,precio,tasa,definitiva"},
    {id:"modalidad",question:"¿Cómo coordino una operación?",answer:"Elegí la divisa y el monto en el conversor. Luego escribinos por WhatsApp para confirmar la cotización, el medio de pago y cómo realizar el cambio.",keywords:"operar,operacion,operación,comprar,vender,transferencia,efectivo,pago"},
    {id:"usdt",question:"¿Puedo consultar por USDT?",answer:"Sí. Cuando la cotización de USDT esté habilitada, seleccionala en el conversor y elegí la moneda que querés recibir. Confirmamos la red, las posibles comisiones y el importe final antes de operar.",keywords:"usdt,tether,cripto,red,comision,comisión,cargo"},
    {id:"dolar",question:"¿Qué diferencia hay entre Dólar Azul y Dólar Verde?",answer:"En nuestra lista aparecen como dos categorías de dólares en efectivo, con cotizaciones separadas. Consultanos qué billetes corresponden a cada categoría y sus condiciones de recepción.",keywords:"azul,verde,billete,billetes,diferencia"},
    {id:"ofertas",question:"¿Cómo aprovecho una oferta?",answer:"Elegí una oferta para cargar su monto en el conversor y consultanos por WhatsApp. El beneficio se aplica al monto y a las condiciones indicadas, sujeto a confirmación de disponibilidad.",keywords:"oferta,promocion,promoción,descuento"},
  ],
  bot:{name:"Asistente DP",welcome:"¡Hola! Soy el asistente automático de Divisas Posadas. Te ayudo con las cotizaciones y las consultas frecuentes. ¿Qué necesitás?",fallback:"Puedo ayudarte con cotizaciones, ofertas, horarios, ubicación y cómo operar. Para una consulta específica, escribile a nuestro equipo por WhatsApp."},
};
export const peso={id:"ars" as const,name:"Pesos argentinos",code:"ARS",symbol:"$",color:"#618CB2",active:true,buy:1,sell:1,description:"Argentina"};
export function getCurrency(content:SiteContent,id:ExchangeId){return id==="ars"?peso:content.currencies.find(c=>c.id===id)!;}
export function convert(content:SiteContent,amount:number,from:ExchangeId,to:ExchangeId){
  if(!Number.isFinite(amount)||amount<=0||amount>1e12)return 0;
  if(from===to)return amount;
  const source=getCurrency(content,from);const target=getCurrency(content,to);
  if(!source?.active||!target?.active||!target.sell)return 0;
  return amount*source.buy/target.sell;
}
export function formatNumber(value:number,decimals=2){return new Intl.NumberFormat("es-AR",{minimumFractionDigits:decimals,maximumFractionDigits:decimals}).format(value);}
export function rateNumber(value:number){return new Intl.NumberFormat("es-AR",{minimumFractionDigits:value<1?3:0,maximumFractionDigits:value<1?6:2}).format(value);}
// Los datos guardados siguen siendo ARS por 1 PYG, para preservar las
// cotizaciones, el conversor y las ofertas existentes.
export function guaraniesPorPeso(arsPorGuarani:number){
  if(!Number.isFinite(arsPorGuarani)||arsPorGuarani<=0)return 0;
  const valor=1/arsPorGuarani;
  return Number.isFinite(valor)?valor:0;
}
export function guaraniesPorPesoFormato(arsPorGuarani:number){
  return new Intl.NumberFormat("es-AR",{minimumFractionDigits:2,maximumFractionDigits:2}).format(guaraniesPorPeso(arsPorGuarani));
}
// Solo para la carga en el panel: hasta dos decimales en guaraníes por peso.
export function guaraniesPorPesoEditor(arsPorGuarani:number){
  return Number(guaraniesPorPeso(arsPorGuarani).toFixed(2));
}
export function arsPorGuarani(guaraniesPorPesoIngresado:number){
  if(!Number.isFinite(guaraniesPorPesoIngresado)||guaraniesPorPesoIngresado<=0)return 0;
  return 1/guaraniesPorPesoIngresado;
}
export function activeOffers(content:SiteContent,now=Date.now()){return content.offers.filter(o=>o.active&&(!o.expiresAt||new Date(o.expiresAt).getTime()>now)&&getCurrency(content,o.from)?.active&&getCurrency(content,o.to)?.active);}
export const operationWhatsapp="5493764271559";
export function whatsappLink(content:SiteContent,message:string){const number=content.contact.whatsapp||operationWhatsapp;return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;}
const normalize=(s:string)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
export function botReply(content:SiteContent,message:string){
  const q=normalize(message);
  if(/\b(hola|buenas|buenos dias|buen dia)\b/.test(q))return content.bot.welcome;
  if(/\b(horario|horarios|abren|atienden|abierto)\b/.test(q))return content.contact.hours;
  if(/\b(ubicacion|direccion|donde|local)\b/.test(q))return content.contact.address?`${content.contact.address}. ${content.contact.location}.`:`Estamos en ${content.contact.location}. Escribinos para coordinar el punto de atención.`;
  if(/cotiza|precio|cuanto|valor|tasa/.test(q)){
    const selected=content.currencies.filter(c=>c.active&&(q.includes(normalize(c.name))||q.includes(c.id)||q.includes(normalize(c.code))));
    const cs=selected.length?selected:content.currencies.filter(c=>c.active);
    return `${content.demo?"Valores de ejemplo; no son cotizaciones reales.\n\n":"Cotizaciones orientativas publicadas:\n\n"}${cs.map(c=>c.id==="guarani"?`${c.name}: compramos a ₲ ${guaraniesPorPesoFormato(c.buy)} por $ 1 ARS · vendemos a ₲ ${guaraniesPorPesoFormato(c.sell)} por $ 1 ARS.`:`${c.name}: compramos a $ ${rateNumber(c.buy)} · vendemos a $ ${rateNumber(c.sell)} ARS por 1 ${c.code}.`).join("\n")}\n\nConfirmá el valor final y la disponibilidad con nuestro equipo.`;
  }
  if(/oferta|promocion/.test(q)){const offers=activeOffers(content);return offers.length?`${content.demo?"Ofertas de ejemplo:\n\n":"Ofertas publicadas:\n\n"}${offers.map(o=>`${o.title}: entregás ${formatNumber(o.amount)} ${getCurrency(content,o.from).code} y recibís ${formatNumber(o.receive)} ${getCurrency(content,o.to).code}.`).join("\n")}\n\nConsultá disponibilidad y condiciones.`:"Por el momento no hay ofertas activas. Podés consultar una propuesta con nuestro equipo.";}
  const matches=content.faqs.map(f=>({f,score:f.keywords.split(",").map(k=>normalize(k.trim())).filter(k=>k&&q.includes(k)).length})).sort((a,b)=>b.score-a.score);
  return matches[0]?.score?matches[0].f.answer:content.bot.fallback;
}
