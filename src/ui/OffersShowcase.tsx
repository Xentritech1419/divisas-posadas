"use client";
import {useRef,type CSSProperties} from "react";
import {ArrowRight,ArrowUpRight,ChevronLeft,ChevronRight,Clock3,Sparkles} from "lucide-react";
import {type Offer,type SiteContent,convert,formatNumber,getCurrency} from "@/lib/content";
import {CurrencyIcon} from "./Brand";

type Props={content:SiteContent;offers:Offer[];onSelect:(offer:Offer)=>void};

function formattedExpiration(value:string){
  return new Intl.DateTimeFormat("es-AR",{
    day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit",
    timeZone:"America/Argentina/Buenos_Aires"
  }).format(new Date(value));
}

export default function OffersShowcase({content,offers,onSelect}:Props){
  const track=useRef<HTMLDivElement>(null);

  function scrollOffers(direction:-1|1){
    const rail=track.current;
    const card=rail?.querySelector<HTMLElement>(".shop-offer-card");
    if(!rail||!card)return;
    const gap=parseFloat(getComputedStyle(rail).columnGap)||18;
    rail.scrollBy({left:direction*(card.getBoundingClientRect().width+gap),behavior:"smooth"});
  }

  return <section className="offers-section shop-offers-section" id="ofertas" aria-labelledby="offers-heading">
    <div className="shell">
      <div className="shop-offers-heading">
        <div>
          <span className="eyebrow section-eyebrow"><Sparkles size={14}/> OPORTUNIDADES PARA VOS</span>
          <h2 id="offers-heading">{content.copy.offersTitle}</h2>
          <p>{content.copy.offersDescription}</p>
        </div>
        <span className="shop-offers-heading-mark"><Sparkles size={17}/> Ofertas destacadas</span>
      </div>

      {offers.length>0&&<div className="shop-offers-track" ref={track} role="region"
        aria-label="Ofertas disponibles" tabIndex={offers.length>1?0:undefined}>
        {offers.map(offer=>{
          const from=getCurrency(content,offer.from);
          const to=getCurrency(content,offer.to);
          const usual=convert(content,offer.amount,offer.from,offer.to);
          const gain=usual>0?(offer.receive/usual-1)*100:0;
          const bonus=Number.isFinite(gain)&&gain>0.05;
          return <article key={offer.id} className="shop-offer-card"
            aria-label={offer.title}
            style={{"--shop-offer-accent":to.color} as CSSProperties}>
            <div className="shop-offer-visual">
              <span className="shop-offer-label"><Sparkles size={13}/> OFERTA ESPECIAL</span>
              {bonus&&<span className="shop-offer-bonus">+{formatNumber(gain,1)}% más</span>}
              <div className="shop-offer-icons" aria-hidden="true">
                <span className="shop-offer-icon"><CurrencyIcon id={offer.from} color={from.color}/></span>
                <span className="shop-offer-exchange"><ArrowRight size={19}/></span>
                <span className="shop-offer-icon"><CurrencyIcon id={offer.to} color={to.color}/></span>
              </div>
              <span className="shop-offer-visual-caption">{from.code} <ArrowRight size={12}/> {to.code}</span>
            </div>

            <div className="shop-offer-content">
              {offer.description&&<p className="shop-offer-description">{offer.description}</p>}
              <div className="shop-offer-prices">
                <div className="shop-offer-price-block">
                  <span>DISPONIBLES</span>
                  <strong>{formatNumber(offer.amount,Number.isInteger(offer.amount)?0:2)} <small>{from.code}</small></strong>
                  <span className="shop-offer-currency">{from.name}</span>
                </div>
                <div className="shop-offer-price-block shop-offer-receive">
                  <span>Envías</span>
                  <strong>{formatNumber(offer.receive,Number.isInteger(offer.receive)?0:2)} <small>{to.code}</small></strong>
                  <span className="shop-offer-currency">{to.name}</span>
                </div>
              </div>
              {bonus&&<p className="shop-offer-comparison">
                Recibís <b>{formatNumber(offer.receive-usual,Number.isInteger(offer.receive-usual)?0:2)} {to.code} más</b> respecto al cambio habitual estimado.
              </p>}
              <div className="shop-offer-actions">
                <button type="button" className="shop-offer-cta" onClick={()=>onSelect(offer)}>
                  Quiero esta oferta <ArrowUpRight size={18}/>
                </button>
                <span className="shop-offer-conditions">
                  {offer.expiresAt?<><Clock3 size={13}/> Hasta {formattedExpiration(offer.expiresAt)} (ARG)</>:
                    content.demo?"Oferta ilustrativa · Consultá disponibilidad":"Sujeta a disponibilidad y confirmación"}
                </span>
              </div>
            </div>
          </article>;
        })}
      </div>}
      {offers.length===0&&<div className="empty-state">Estamos preparando nuevas ofertas. Consultanos por la divisa que necesitás.</div>}
      <div className="shop-offers-footer">
        <div className="carousel-buttons shop-offer-controls" aria-label="Desplazamiento de ofertas">
          <button type="button" className="icon-button" aria-label="Ver ofertas anteriores"
            onClick={()=>scrollOffers(-1)} disabled={offers.length<2}><ChevronLeft size={20}/></button>
          <button type="button" className="icon-button next" aria-label="Ver siguientes ofertas"
            onClick={()=>scrollOffers(1)} disabled={offers.length<2}><ChevronRight size={20}/></button>
        </div>
        <p>{content.demo?"Propuestas ilustrativas. Solicitá confirmar los montos antes de operar.":
          "Los valores son orientativos, sujetos a disponibilidad y confirmación para el monto indicado."}</p>
      </div>
    </div>
  </section>;
}
