"use client";
import {useState,useRef,useEffect,type CSSProperties} from "react";
import {ArrowUpRight,ArrowLeftRight,ArrowDown,ChevronDown,MapPin,MessageCircle,Menu,X,RefreshCw,Check,Plus,Minus,Info,Copy,CheckCheck,Sparkles,Coins,MessagesSquare,BadgeCheck,ArrowRight,Headset} from "lucide-react";
import {type ContentState,type ExchangeId,type Offer,type SiteContent,activeOffers,convert,formatNumber,rateNumber,getCurrency,whatsappLink,guaraniesPorPesoFormato,peso} from "@/lib/content";
import {Brand,CurrencyIcon} from "./Brand";
import OffersShowcase from "./OffersShowcase";
import ChatWidget from "./ChatWidget";

function updatedLabel(date:string|null){return date?new Intl.DateTimeFormat("es-AR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit",timeZone:"America/Argentina/Buenos_Aires"}).format(new Date(date)):"Valores de demostración";}

export default function Landing({initialState}:{initialState:ContentState}){
  const [state,setState]=useState(initialState);const c=state.content;
  const [navOpen,setNavOpen]=useState(false);const [filter,setFilter]=useState("all");
  const [from,setFrom]=useState<ExchangeId>(initialState.content.currencies.find(x=>x.active)?.id||"ars");const [to,setTo]=useState<ExchangeId>("ars");const [amount,setAmount]=useState("100");const [offerId,setOfferId]=useState<string|null>(null);
  const [now,setNow]=useState(Date.now());const [refreshing,setRefreshing]=useState(false);const [refreshError,setRefreshError]=useState("");
  const [chatOpen,setChatOpen]=useState(false);
  const [quote,setQuote]=useState<string|null>(null);const [copied,setCopied]=useState(false);
  const dialog=useRef<HTMLDialogElement>(null);
  const offers=activeOffers(c,now);const selectedOffer=offers.find(o=>o.id===offerId&&o.from===from&&o.to===to&&o.amount===Number(amount));
  const source=getCurrency(c,from);const target=getCurrency(c,to);const numeric=Number(amount);
  const valid=numeric>0&&numeric<=1e12&&Number.isFinite(numeric)&&from!==to&&source.active&&target.active;
  const result=valid?(selectedOffer?.receive??convert(c,numeric,from,to)):0;
  const options=[peso,...c.currencies.filter(x=>x.active)];
  const generalWhatsapp=whatsappLink(c,`Hola, ${c.brand.name}. Quiero consultar por un cambio de divisas.`);
  const quoteMessage=`Hola, ${c.brand.name}. Quiero consultar ${selectedOffer?`la oferta «${selectedOffer.title}»`:'un cambio'}: entrego ${formatNumber(numeric)} ${source.name} (${source.code}) y recibiría aproximadamente ${formatNumber(result)} ${target.name} (${target.code}). ¿Me confirman la cotización y disponibilidad?${c.demo?' [Solicito confirmar una cotización actual]':''}`;
  async function refresh(manual=false){if(manual)setRefreshing(true);try{const r=await fetch("/api/content",{cache:"no-store"});if(!r.ok)throw new Error();const next=await r.json() as ContentState;setState(next);setRefreshError("");}catch{if(manual)setRefreshError("No pudimos actualizar. Se mantienen los últimos valores cargados.");}finally{if(manual)setRefreshing(false);}}
  useEffect(()=>{const timer=setInterval(()=>{void refresh();setNow(Date.now());},60000);const sync=(event:StorageEvent)=>{if(event.key==="dp-content-revision")void refresh(true);};window.addEventListener("storage",sync);return()=>{clearInterval(timer);window.removeEventListener("storage",sync);};},[]);
  useEffect(()=>{if(!source.active){setFrom(options.find(x=>x.id!==to)?.id||"ars");setOfferId(null);}if(!target.active){setTo("ars");setOfferId(null);}},[c]);
  useEffect(()=>{if(quote){dialog.current?.showModal();setCopied(false);}else dialog.current?.close();},[quote]);
  useEffect(()=>{function escape(e:KeyboardEvent){if(e.key==="Escape"){setChatOpen(false);setNavOpen(false);}}document.addEventListener("keydown",escape);return()=>document.removeEventListener("keydown",escape);},[]);
  function contactCurrency(id:ExchangeId,direction:"buy"|"sell"){const currency=getCurrency(c,id);const rate=direction==="buy"?currency.sell:currency.buy;const action=direction==="buy"?"comprar":"vender";const cotizacion=currency.id==="guarani"?`₲ ${guaraniesPorPesoFormato(rate)} por $ 1 ARS`:`$ ${rateNumber(rate)} ARS por unidad`;const message=`Hola, ${c.brand.name}. Quiero ${action} ${currency.name} (${currency.code}). La cotización publicada es ${cotizacion}. ¿Me confirman el valor y la disponibilidad para realizar la operación?${c.demo?" [Solicito una cotización actualizada]":""}`;window.open(whatsappLink(c,message),"_blank","noopener,noreferrer");}
  function selectOffer(o:Offer){setFrom(o.from);setTo(o.to);setAmount(String(o.amount));setOfferId(o.id);document.getElementById("conversor")?.scrollIntoView({behavior:"smooth",block:"center"});}
  function goContact(){setChatOpen(true);}
  const visibleCurrencies=c.currencies.filter(x=>x.active&&(filter==="all"||(filter==="digital"?x.id==="usdt":x.id!=="usdt")));
  return <div className="site" style={{"--primary":c.brand.primary,"--ink":c.brand.dark} as CSSProperties}>
    <a href="#cotizaciones" className="skip-link">Ir a cotizaciones</a>
    <header className="site-header"><div className="shell nav-shell"><Brand content={c}/><nav className={navOpen?"nav-links is-open":"nav-links"} aria-label="Navegación principal">{[["Ofertas","#ofertas"],["Cotizaciones","#cotizaciones"],["Cómo funciona","#como-funciona"]].map(([label,link])=><a key={link} href={link} onClick={()=>setNavOpen(false)}>{label}</a>)}</nav><button className="button button-small header-contact" onClick={goContact} aria-label="Abrir atención por chat"><MessageCircle size={19} aria-hidden="true"/><span>Hablemos</span><ArrowUpRight size={16} aria-hidden="true"/></button><button className="icon-button mobile-menu" onClick={()=>setNavOpen(!navOpen)} aria-label={navOpen?"Cerrar menú":"Abrir menú"} aria-expanded={navOpen}>{navOpen?<X/>:<Menu/>}</button></div></header>
    <main>
      <section className="hero"><div className="hero-orbit" aria-hidden="true"/><div className="shell hero-grid"><div className="hero-copy"><div className="eyebrow"><span className="status-dot"/>{c.copy.eyebrow}</div><h1>{c.copy.heroTitle}<br/><span>{c.copy.heroAccent.trim().toLocaleLowerCase("es-AR")==="empieza acá."?"comienza acá.":c.copy.heroAccent}</span></h1><p className="hero-description">{c.copy.heroDescription}</p><a className="hero-link" href="#cotizaciones">Conocé las cotizaciones <span><ArrowDown size={19}/></span></a><div className="hero-footnote"><span><MapPin size={16}/>{c.contact.location}</span><i/><span>Atención de persona a persona</span></div></div>
      <div className="converter" id="conversor"><div className="converter-heading"><div><span className="mini-label">HACÉ TUS CUENTAS</span><h2>Calculá tu cambio</h2></div><span className="converter-icon"><ArrowLeftRight size={23}/></span></div><div className="converter-field"><label htmlFor="amount">Vos entregás</label><div className="amount-row"><input id="amount" type="number" inputMode="decimal" min="0.01" max="1000000000000" step="any" value={amount} onChange={e=>{setAmount(e.target.value);setOfferId(null);}} aria-describedby="conversion-note"/><CurrencyIcon small id={from} color={source.color}/></div><div className="currency-select"><select aria-label="Moneda que entregás" value={from} onChange={e=>{const v=e.target.value as ExchangeId;setFrom(v);if(v===to)setTo(from);setOfferId(null);}}>{options.map(x=><option value={x.id} key={x.id}>{x.name} · {x.code}</option>)}</select><ChevronDown size={14}/></div></div><div className="swap-line"><span/><button aria-label="Invertir monedas" onClick={()=>{setFrom(to);setTo(from);setOfferId(null);}}><ArrowLeftRight size={18}/></button><span/></div><div className="converter-field receiving"><label>Vos recibís aproximadamente</label><div className="amount-row"><output aria-live="polite">{formatNumber(result,2)}</output><CurrencyIcon small id={to} color={target.color}/></div><div className="currency-select"><select aria-label="Moneda que recibís" value={to} onChange={e=>{const v=e.target.value as ExchangeId;setTo(v);if(v===from)setFrom(to);setOfferId(null);}}>{options.map(x=><option value={x.id} key={x.id}>{x.name} · {x.code}</option>)}</select><ChevronDown size={14}/></div></div>
        <div className="conversion-rate">{selectedOffer?<><Sparkles size={13}/> Oferta seleccionada · monto fijo</>:<><ArrowLeftRight size={13}/> 1 {source.code} = {formatNumber(convert(c,1,from,to),to==="ars"&&from==="guarani"?3:4)} {target.code}</>}</div>
        <button className="button converter-submit" disabled={!valid} onClick={()=>setQuote(quoteMessage)}>Consultar este cambio <ArrowUpRight size={18}/></button><p id="conversion-note" className="converter-note">{c.demo?"Importes ilustrativos; solicitá una cotización actual.":"Cotización orientativa, sujeta a confirmación."}</p>{!valid&&amount!==""&&<p className="field-error">Ingresá un monto positivo y elegí dos monedas distintas.</p>}
      </div></div></section>
      <div className="currency-ribbon"><div className="shell ribbon-inner"><span className="ribbon-title">TU MUNDO, EN DIVISAS</span>{c.currencies.filter(x=>x.active).map(x=><span key={x.id}><CurrencyIcon small id={x.id} color={x.color}/>{x.name}</span>)}</div></div>
      <OffersShowcase content={c} offers={offers} onSelect={selectOffer}/>
      <section className="section rates-section shell" id="cotizaciones"><div className="section-heading"><div><span className="eyebrow section-eyebrow">COTIZACIONES</span><h2>{c.copy.ratesTitle}</h2><p>{c.copy.ratesDescription==="Compará nuestros valores de compra y venta en pesos argentinos."?"Compará los valores de compra y venta. Para guaraníes mostramos cuántos guaraníes equivalen a un peso argentino.":c.copy.ratesDescription}</p></div><div className="update-stamp"><button onClick={()=>void refresh(true)} disabled={refreshing} aria-label="Actualizar cotizaciones"><RefreshCw size={15} className={refreshing?"spinning":""}/></button><span>{c.demo?"VALORES ORIENTATIVOS":"ÚLTIMA ACTUALIZACIÓN"}<b>{c.demo?"Confirmar por WhatsApp":updatedLabel(state.updatedAt)}</b></span></div></div>
      <div className="rates-toolbar"><div className="filter-tabs" role="group" aria-label="Filtrar divisas">{[["all","Todas las divisas"],["cash","Efectivo"],["digital","Saldo digital"]].map(([value,label])=><button aria-pressed={filter===value} className={filter===value?"active":""} key={value} onClick={()=>setFilter(value)}>{label}</button>)}</div><span className="rates-currency">Otras divisas: ARS por unidad · Guaraníes: ₲ por $ 1</span></div>
      {refreshError&&<p className="notice" role="status">{refreshError}</p>}<div className="rates-grid">{visibleCurrencies.map((x,i)=><article className="rate-card" style={{"--currency":x.color,"--delay":`${i*50}ms`} as CSSProperties} key={x.id}><div className="rate-card-top"><CurrencyIcon id={x.id} color={x.color}/><div><h3>{x.name}</h3><p>{x.description}</p></div><span className="currency-code">{x.code}</span></div><div className="rate-values"><div><span>Compramos <ArrowDown size={12}/></span><strong><small>{x.id==="guarani"?"₲":"$"}</small> {x.id==="guarani"?guaraniesPorPesoFormato(x.buy):rateNumber(x.buy)}</strong>{x.id==="guarani"&&<small className="guarani-unit">por $ 1 ARS</small>}</div><div><span>Vendemos <ArrowUpRight size={12}/></span><strong><small>{x.id==="guarani"?"₲":"$"}</small> {x.id==="guarani"?guaraniesPorPesoFormato(x.sell):rateNumber(x.sell)}</strong>{x.id==="guarani"&&<small className="guarani-unit">por $ 1 ARS</small>}</div></div><div className="rate-actions"><button className="rate-action-buy" onClick={()=>contactCurrency(x.id,"buy")}>Quiero comprar <ArrowUpRight size={15}/></button><button className="rate-action-sell" onClick={()=>contactCurrency(x.id,"sell")}>Quiero vender <ArrowUpRight size={15}/></button></div></article>)}</div>{visibleCurrencies.length===0&&<div className="empty-state">No hay divisas activas en esta categoría.</div>}<p className="rates-note"><Info size={14}/> Compra: recibimos tu divisa. Venta: te entregamos la divisa. {c.demo?"Valores ilustrativos, no válidos para operar.":"Confirmá la cotización antes de operar."}</p></section>
      <section className="section shell how-section" id="como-funciona" aria-labelledby="how-heading">
        <div className="how-title">
          <span className="eyebrow section-eyebrow">DE LA CONSULTA AL CAMBIO</span>
          <h2 id="how-heading">{c.copy.howTitle}</h2>
          <p>Vos elegís. Nosotros te acompañamos.</p>
          <div className="how-caption"><BadgeCheck size={18}/> Un proceso simple y acompañado de principio a fin.</div>
        </div>
        <div className="steps">
          {c.steps.map((step,i)=><article className={`how-step how-step-${i+1}`} key={i}>
            <div className="how-step-visual">
              <span className="how-step-number">0{i+1}</span>
              <span className="how-step-symbol" aria-hidden="true">{i===0?<Coins size={33} strokeWidth={1.8}/>:i===1?<MessagesSquare size={33} strokeWidth={1.8}/>:<BadgeCheck size={33} strokeWidth={1.8}/>}</span>
            </div>
            <div className="how-step-body">
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </div>
            {i<2&&<ArrowRight className="how-step-arrow" size={21} aria-hidden="true"/>}
          </article>)}
        </div>
      </section>
      <section className="faq-section shell" id="preguntas" aria-labelledby="faq-heading">
        <div className="faq-panel">
          <div className="faq-panel-decor" aria-hidden="true"><ArrowLeftRight/></div>
          <div className="faq-intro">
            <span className="eyebrow section-eyebrow"><Sparkles size={14}/> SIN DUDAS, MEJOR</span>
            <h2 id="faq-heading">Antes de cambiar,<br/>te contamos.</h2>
            <p>Las respuestas a las consultas más comunes.</p>
            <button className="faq-cta" type="button" onClick={()=>setChatOpen(true)}>
              <Headset size={19}/> Preguntale al asistente <ArrowUpRight size={17}/>
            </button>
          </div>
          <div className="faq-list">
            {c.faqs.map(f=><details key={f.id}>
              <summary><span>{f.question}</span><span className="faq-indicator"><Plus size={18} className="faq-plus"/><Minus size={18} className="faq-minus"/></span></summary>
              <p>{f.answer}</p>
            </details>)}
          </div>
        </div>
      </section>
    </main>
    <footer className="site-footer shell">
      <div className="footer-main">
        <div className="footer-brand-block">
          <Brand content={c}/>
          <p>Cotizaciones claras y atención personalizada para tu próximo cambio.</p>
        </div>
        <nav className="footer-links" aria-label="Enlaces útiles">
          <a href="#cotizaciones">Cotizaciones</a>
          <a href="#conversor">Conversor</a>
          <a href="#preguntas">Preguntas frecuentes</a>
          {generalWhatsapp&&<a href={generalWhatsapp} target="_blank" rel="noreferrer"><MessageCircle size={15}/> WhatsApp</a>}
        </nav>
      </div>
      <p className="disclaimer">{c.copy.disclaimer}</p>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} {c.brand.name}. Todos los derechos reservados.</span>
        <span className="footer-location"><MapPin size={14}/> {c.contact.location}</span>
      </div>
    </footer>
    <ChatWidget content={c} open={chatOpen} onOpenChange={setChatOpen}/>
    <dialog ref={dialog} aria-labelledby="quote-title" className="quote-dialog" onCancel={()=>setQuote(null)} onClick={e=>{if(e.target===dialog.current)setQuote(null);}}><button className="dialog-close icon-button" onClick={()=>setQuote(null)} aria-label="Cerrar consulta"><X size={20}/></button><span className="dialog-icon"><ArrowLeftRight size={28}/></span><span className="eyebrow section-eyebrow">TU CONSULTA ESTÁ LISTA</span><h2 id="quote-title">Un paso más para tu cambio.</h2><p className="quote-summary">{quote}</p>{c.contact.whatsapp?<a className="button" href={whatsappLink(c,quote||"")||"#"} target="_blank" rel="noreferrer"><MessageCircle size={18}/> Enviar por WhatsApp <ArrowUpRight size={17}/></a>:<p className="notice">El contacto por WhatsApp todavía no está disponible. Podés copiar tu consulta.</p>}<button className="text-button copy-button" onClick={async()=>{try{await navigator.clipboard.writeText(quote||"");setCopied(true);}catch{setCopied(false);}}}>{copied?<CheckCheck size={16}/>:<Copy size={16}/>} {copied?"Consulta copiada":"Copiar consulta"}</button><small>El monto se confirma con nuestro equipo antes de operar.</small></dialog>
  </div>;
}
