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
export function CurrencyIcon({id,color,small=false}:{id:ExchangeId;color?:string;small?:boolean}){
  return <span className={`currency-icon ${small?"currency-small":""} currency-${id}`} style={{"--coin":color||"#5685AA"} as React.CSSProperties} aria-hidden="true">
    {id==="real"?<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="#268658"/><path d="m20 6 16 14-16 14L4 20Z" fill="#FAD567"/><circle cx="20" cy="20" r="8.5" fill="#286298"/><path d="M13 17c6 0 9 2 14 6" stroke="white" strokeWidth="1.5"/></svg>:id==="guarani"?<svg viewBox="0 0 40 40"><defs><clipPath id={`py-${small?"s":"l"}`}><circle cx="20" cy="20" r="20"/></clipPath></defs><g clipPath={`url(#py-${small?"s":"l"})`}><path fill="#CC5363" d="M0 0h40v14H0z"/><path fill="#FFF" d="M0 14h40v12H0z"/><path fill="#3F5F9D" d="M0 26h40v14H0z"/></g><circle cx="20" cy="20" r="4" fill="none" stroke="#51896C" strokeWidth="1.2"/><circle cx="20" cy="20" r="1.5" fill="#DFBE5C"/></svg>:id==="ars"?<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="#83BFE1"/><path d="M1 14h38v12H1z" fill="white"/><circle cx="20" cy="20" r="4" fill="#E8B84E"/></svg>:id==="euro"?<span>€</span>:id==="paypal"?<span className="paypal-letter">P</span>:<svg viewBox="0 0 40 40" fill="none"><rect x="5" y="10" width="30" height="20" rx="4" stroke="currentColor" strokeWidth="1.6"/><circle cx="20" cy="20" r="6" stroke="currentColor" strokeWidth="1.5"/><path d="M11 17v6m18-6v6m-9-9v12m2-9c-4-2-6 3-2 3s2 5-2 3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/></svg>}
  </span>;
}
