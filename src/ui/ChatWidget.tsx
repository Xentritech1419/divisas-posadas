"use client";
import {useEffect,useRef,useState} from "react";
import {ArrowUpRight,MessageCircle,Send,X,UserRound,RotateCcw,ChartNoAxesCombined,Route,Clock3,BadgePercent,Headset,MessageCircleMore} from "lucide-react";
import {type SiteContent,botReply,whatsappLink} from "@/lib/content";
import {guestChat,getLiveStatus,makeGuestToken,type LiveMessage,type LiveThread,LiveChatError} from "@/lib/liveChat";
import {Mark} from "./Brand";

type BotMessage={role:"user"|"bot";text:string};

export default function ChatWidget({content,open,onOpenChange}:{content:SiteContent;open:boolean;onOpenChange:(open:boolean)=>void}){
  const [history,setHistory]=useState<BotMessage[]>([]);
  const [question,setQuestion]=useState("");
  const [online,setOnline]=useState(false);
  const [human,setHuman]=useState(false);
  const [thread,setThread]=useState<LiveThread|null>(null);
  const [connecting,setConnecting]=useState(false);
  const [sending,setSending]=useState(false);
  const [error,setError]=useState("");
  const token=useRef<string|null>(null);
  const end=useRef<HTMLDivElement>(null);

  function visitorToken(){return token.current??(token.current=makeGuestToken());}
  const chatHistory:BotMessage[]=human&&thread?thread.messages.map(m=>({role:m.role==="visitor"?"user":"bot",text:m.text})): [{role:"bot",text:content.bot.welcome},...history];
  const whatsappMessage=[
    `Hola, ${content.brand.name}. Quiero continuar esta consulta con una persona.`,
    ...chatHistory.slice(-8).map(m=>`${m.role==="user"?"Cliente":"Asistente"}: ${m.text.slice(0,190)}`)
  ].join("\n").slice(0,1500);
  const whatsapp=whatsappLink(content,whatsappMessage);

  useEffect(()=>{
    let active=true;
    async function status(){
      try{const result=await getLiveStatus();if(active)setOnline(result);}
      catch{if(active)setOnline(false);}
    }
    void status();
    const poll=setInterval(()=>void status(),open?5000:15000);
    return()=>{active=false;clearInterval(poll);};
  },[open]);

  useEffect(()=>{
    if(!open||!human)return;
    let active=true;
    async function fetchThread(){
      try{
        const result=await guestChat(visitorToken(),"poll");
        if(active){setThread(result.thread);setOnline(result.online);}
      }catch{if(active)setOnline(false);}
    }
    void fetchThread();
    const poll=setInterval(()=>void fetchThread(),4000);
    return()=>{active=false;clearInterval(poll);};
  },[open,human]);

  useEffect(()=>{if(open)end.current?.scrollIntoView({behavior:"smooth",block:"nearest"});},[open,history,thread?.messages.length]);

  function askBot(text:string){
    const cleaned=text.trim();if(!cleaned)return;
    setHistory(list=>[...list,{role:"user" as const,text:cleaned},{role:"bot" as const,text:botReply(content,cleaned)}].slice(-40));
    setQuestion("");
  }

  async function startHuman(){
    if(connecting)return;
    setError("");setConnecting(true);
    try{
      const initial=[{role:"bot",text:content.bot.welcome},...history].slice(-18);
      const result=await guestChat(visitorToken(),"start",{history:initial});
      setOnline(result.online);setThread(result.thread);setHuman(true);setQuestion("");
    }catch(e){
      if(e instanceof LiveChatError&&e.offline)setOnline(false);
      setError(e instanceof Error?e.message:"No pudimos iniciar la atención humana.");
    }finally{setConnecting(false);}
  }

  async function submit(text:string){
    const cleaned=text.trim();if(!cleaned||sending)return;
    if(!human){askBot(cleaned);return;}
    if(!online||thread?.closed){setError("No hay un asesor atendiendo ahora. Podés continuar por WhatsApp.");return;}
    setSending(true);setError("");
    try{
      const result=await guestChat(visitorToken(),"send",{text:cleaned});
      setThread(result.thread);setOnline(result.online);setQuestion("");
    }catch(e){
      if(e instanceof LiveChatError&&e.offline)setOnline(false);
      setError(e instanceof Error?e.message:"No pudimos enviar el mensaje.");
    }finally{setSending(false);}
  }

  function shownMessage(message:LiveMessage){
    return <div className={`message ${message.role==="visitor"?"user":"bot"} ${message.role==="operator"?"message-operator":""}`} key={message.id}>
      {message.role==="operator"&&<small>Asesor: {message.by||"Equipo"}</small>}
      {message.text}
    </div>;
  }

  return <>
    <div className="chat-dock">
      {!open&&<span className="chat-teaser">¿En qué te ayudamos?</span>}
      <button className="chat-toggle" onClick={()=>onOpenChange(!open)} aria-expanded={open} aria-controls="chat-window" aria-label={open?"Cerrar asistente":"Abrir asistente"}>
        {open?<X size={24}/>:<MessageCircle size={25}/>}<span className={online?"online":"offline"}/>
      </button>
    </div>
    {open&&<aside className="chat-window" id="chat-window" aria-label="Atención automática y humana">
      <div className="chat-head">
        <Mark className="chat-mark"/>
        <div><strong>{human?"Atención de Cambios Posadas":content.bot.name}</strong>
          <span>{human?(online?"Asesor en línea":"Sin asesores disponibles"):(online?"Asesor disponible · chat en vivo":"Respuestas automáticas · WhatsApp")}</span>
        </div>
        <button onClick={()=>onOpenChange(false)} aria-label="Cerrar chat"><X size={19}/></button>
      </div>
      <div className="chat-messages" aria-live="polite">
        {!human&&<div className="message bot">{content.bot.welcome}</div>}
        {human?thread?.messages.map(shownMessage):history.map((m,i)=><div className={`message ${m.role}`} key={i}>{m.text}</div>)}
        {human&&thread&&!thread.closed&&<p className="live-chat-note">{online?"Estás conversando con nuestro equipo.":"El equipo no está en línea. Podés continuar la consulta por WhatsApp."}</p>}
        {human&&thread?.closed&&<p className="live-chat-note">El asesor finalizó esta conversación. Podés volver al bot o solicitar una nueva atención.</p>}
        <div ref={end}/>
      </div>
      {!human&&<div className="chat-quick" role="group" aria-label="Consultas rápidas">
        <button type="button" className="chat-quick-rates" onClick={()=>askBot("Cotizaciones")}><ChartNoAxesCombined size={18} aria-hidden="true"/><span>Cotizaciones</span></button>
        <button type="button" className="chat-quick-how" onClick={()=>askBot("Cómo operar")}><Route size={18} aria-hidden="true"/><span>Cómo operar</span></button>
        <button type="button" className="chat-quick-hours" onClick={()=>askBot("Horarios")}><Clock3 size={18} aria-hidden="true"/><span>Horarios</span></button>
        <button type="button" className="chat-quick-offers" onClick={()=>askBot("Ofertas")}><BadgePercent size={18} aria-hidden="true"/><span>Ofertas</span></button>
      </div>}
      {!human&&online&&<p className="live-chat-privacy">Para que nuestro equipo te atienda, los mensajes se guardan temporalmente en el servidor.</p>}
      <div className="chat-contact-actions">
        {!human&&online&&<button type="button" className="chat-human chat-live-agent" disabled={connecting} onClick={()=>void startHuman()}>
          <Headset size={20} aria-hidden="true"/>
          <span>{connecting?"Conectando con un asesor…":"Hablar con un asesor en esta web"}</span>
          <ArrowUpRight size={17} aria-hidden="true"/>
        </button>}
        {human&&online&&!thread?.closed&&<div className="chat-human chat-human-active" role="status">
          <Headset size={20} aria-hidden="true"/><span>Un asesor está atendiendo tu consulta</span>
        </div>}
        {(!human||!online||!!thread?.closed)&&<a className="chat-human chat-whatsapp" href={whatsapp} target="_blank" rel="noopener noreferrer">
          <MessageCircleMore size={20} aria-hidden="true"/>
          <span>{human?"Continuar conversación por WhatsApp":"Hablar por WhatsApp"}</span>
          <ArrowUpRight size={17} aria-hidden="true"/>
        </a>}
      </div>
      {human&&<button type="button" className="chat-return" onClick={()=>{setHuman(false);setError("");}}>
        <RotateCcw size={13}/> Volver al asistente automático
      </button>}
      {error&&<p className="chat-error" role="alert">{error}</p>}
      <form className="chat-form" onSubmit={e=>{e.preventDefault();void submit(question);}}>
        <input value={question} onChange={e=>setQuestion(e.target.value)} maxLength={600}
          aria-label="Escribí tu consulta" placeholder={human?"Escribí al asesor…":"Escribí tu consulta…"}
          disabled={sending||(human&&(!online||!!thread?.closed))}/>
        <button type="submit" disabled={sending||!question.trim()||(human&&(!online||!!thread?.closed))} aria-label="Enviar consulta"><Send size={18}/></button>
      </form>
    </aside>}
  </>;
}
