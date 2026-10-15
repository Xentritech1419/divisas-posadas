import {brandLogoUrl,type SiteContent,type ExchangeId} from "@/lib/content";

// El mismo ícono optimizado identifica al sitio, al asistente y al favicon.
export function Mark({className=""}:{className?:string}){
  return <img className={className} src={brandLogoUrl} alt="" aria-hidden="true" draggable={false} width={44} height={44}/>;
}
export function Brand({content,light=false}:{content:SiteContent;light?:boolean}){
  const logo = content.brand.logoUrl || brandLogoUrl;
  return <a className={`brand ${light?"brand-light":""}`} href="/" aria-label={`${content.brand.name}, inicio`}>
    <span className="brand-icon">
      <img className="custom-logo" src={logo} alt="" aria-hidden="true" width={48} height={48} decoding="async"/>
    </span>
    <span className="brand-wordmark"><strong>{content.brand.name}</strong><small>{content.brand.tagline}</small></span>
  </a>;
}
const currencyArt:Partial<Record<ExchangeId,string>>={
  azul:"/icons/usd-azul.svg",
  verde:"/icons/usd-verde.svg",
  euro:"/icons/eur-azul-amarillo.svg",
  usdt:"/icons/usdt-turquesa.svg",
};
export function CurrencyIcon({id,color,small=false}:{id:ExchangeId;color?:string;small?:boolean}){
  const art=currencyArt[id];
  return <span className={`currency-icon ${small?"currency-small":""} currency-${id}`} style={{"--coin":color||"#5685AA"} as React.CSSProperties} aria-hidden="true">
    {art?<img className="currency-art" src={art} alt="" decoding="async" width={small?27:46} height={small?27:46}/>:
      id==="real"?<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="#268658"/><path d="m20 6 16 14-16 14L4 20Z" fill="#FAD567"/><circle cx="20" cy="20" r="8.5" fill="#286298"/><path d="M13 17c6 0 9 2 14 6" stroke="white" strokeWidth="1.5"/></svg>:
      id==="guarani"?<svg viewBox="0 0 40 40"><defs><clipPath id={`py-${small?"s":"l"}`}><circle cx="20" cy="20" r="20"/></clipPath></defs><g clipPath={`url(#py-${small?"s":"l"})`}><path fill="#CC5363" d="M0 0h40v14H0z"/><path fill="#FFF" d="M0 14h40v12H0z"/><path fill="#3F5F9D" d="M0 26h40v14H0z"/></g><circle cx="20" cy="20" r="4" fill="none" stroke="#51896C" strokeWidth="1.2"/><circle cx="20" cy="20" r="1.5" fill="#DFBE5C"/></svg>:
      <svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="#83BFE1"/><path d="M1 14h38v12H1z" fill="white"/><circle cx="20" cy="20" r="4" fill="#E8B84E"/></svg>}
  </span>;
}
