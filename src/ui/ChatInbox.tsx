"use client";
import {useEffect,useRef,useState} from "react";
import {CheckCircle2,Loader2,MessageCircle,Send,Wifi,WifiOff} from "lucide-react";
import {apiFetch} from "@/lib/api";
import {type LiveThread,type LiveThreadSummary} from "@/lib/liveChat";

async function apiJson<T>(path:string,options?:RequestInit):Promise<T>{
  const response=await apiFetch(path,options);
  const data=await response.json() as T & {error?:string};
  if(!response.ok)throw new Error(data.error||"No se pudo contactar al chat.");
  return data;
}

export default function ChatInbox(){
  const [available,setAvailable]=useState(false);
  const [threads,setThreads]=useState<LiveThreadSummary[]>([]);
  const [selected,setSelected]=useState<string|null>(null);
  const [thread,setThread]=useState<LiveThread|null>(null);
  const [text,setText]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(true);
  const clientId=useRef(crypto.randomUUID());
  const messageEnd=useRef<HTMLDivElement>(null);

  useEffect(()=>{
    let alive=true;
    async function fetchThreads(){
      try{
        const data=await apiJson<{threads:LiveThreadSummary[]}>("/api/chat/operator/threads");
        if(alive){
          setThreads(data.threads);
          setSelected(previous=>data.threads.some(t=>t.id===previous)?previous:data.threads.find(t=>!t.closed)?.id??data.threads[0]?.id??null);
        }
      }catch(e){if(alive)setError(e instanceof Error?e.message:"No se pudieron cargar los mensajes.");}
      finally{if(alive)setLoading(false);}
    }
    void fetchThreads();const timer=setInterval(()=>void fetchThreads(),5000);
    return()=>{alive=false;clearInterval(timer);};
  },[]);

  useEffect(()=>{messageEnd.current?.scrollIntoView({behavior:"smooth",block:"nearest"});},[thread?.messages.length]);

  useEffect(()=>{
    if(!selected){setThread(null);return;}
    let active=true;
    async function fetchThread(){
      try{
        const data=await apiJson<{thread:LiveThread}>(`/api/chat/operator/thread?id=${encodeURIComponent(selected!)}`);
        if(active)setThread(data.thread);
      }catch(e){if(active)setError(e instanceof Error?e.message:"No se pudo cargar la conversación.");}
    }
    void fetchThread();const timer=setInterval(()=>void fetchThread(),4000);
    return()=>{active=false;clearInterval(timer);};
  },[selected]);

  useEffect(()=>{
    if(!available)return;
    let active=true;
    const heartbeat=async(on:boolean)=>{
      try{
        await apiJson("/api/chat/operator/heartbeat",{
          method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({available:on,clientId:clientId.current})
        });
      }catch(e){
        if(active&&on){setAvailable(false);setError(e instanceof Error?e.message:"No se pudo activar la disponibilidad.");}
      }
    };
    const pulse=()=>void heartbeat(!document.hidden);
    pulse();
    document.addEventListener("visibilitychange",pulse);
    const timer=setInterval(pulse,12000);
    return()=>{
      active=false;clearInterval(timer);document.removeEventListener("visibilitychange",pulse);
      void heartbeat(false);
    };
  },[available]);

  async function send(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();
    const message=text.trim();
    if(!selected||!message||busy||!available)return;
    setBusy(true);setError("");
    try{
      const data=await apiJson<{thread:LiveThread}>("/api/chat/operator/action",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({action:"send",id:selected,text:message,clientId:clientId.current})
      });
      setThread(data.thread);setText("");
    }catch(e){setError(e instanceof Error?e.message:"No se pudo enviar el mensaje.");}
    finally{setBusy(false);}
  }

  async function close(){
    if(!selected||busy||!window.confirm("¿Finalizar esta conversación con el cliente?"))return;
    setBusy(true);setError("");
    try{
      const data=await apiJson<{thread:LiveThread}>("/api/chat/operator/action",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({action:"close",id:selected})
      });
      setThread(data.thread);
      setThreads(v=>v.map(t=>t.id===selected?{...t,closed:true}:t));
    }catch(e){setError(e instanceof Error?e.message:"No se pudo finalizar la conversación.");}
    finally{setBusy(false);}
  }

  const openThreads=threads.filter(t=>!t.closed).length;
  const formatTime=(epoch:number)=>new Date(epoch*1000).toLocaleString("es-AR",{dateStyle:"short",timeStyle:"short"});
  return <>
    <div className="admin-intro"><h2>Atención en vivo.</h2>
      <p>Las consultas de la web llegan acá cuando activás tu disponibilidad. Si nadie está en línea, el visitante puede continuar por WhatsApp.</p>
    </div>
    <div className="admin-card inbox-presence">
      <div><strong>{available?"Estás disponible para atender":"Actualmente estás fuera de línea"}</strong>
        <p>{available?"Mantené esta sección abierta. Al cerrar o dejar la pestaña, el sistema te desconectará automáticamente.":"Activá la atención cuando puedas responder. Las cotizaciones y el bot siguen funcionando normalmente."}</p>
      </div>
      <button type="button" className={`button inbox-status-button ${available?"inbox-offline-button":""}`}
        onClick={()=>{setError("");setAvailable(v=>!v);}}>
        {available?<WifiOff size={17}/>:<Wifi size={17}/>}
        {available?"Ponerme fuera de línea":"Ponerme en línea"}
      </button>
    </div>
    {error&&<div className="admin-alert error" role="alert">{error}</div>}
    <div className="inbox-layout">
      <section className="admin-card inbox-list" aria-label="Conversaciones recibidas">
        <div className="inbox-list-header"><strong>Conversaciones</strong><span>{openThreads} abiertas</span></div>
        {loading&&<p className="inbox-empty"><Loader2 className="spinning" size={16}/> Cargando…</p>}
        {!loading&&threads.length===0&&<p className="inbox-empty">Todavía no hay consultas en vivo. Activá tu disponibilidad y dejá esta sección abierta.</p>}
        {threads.map(t=><button key={t.id} type="button" className={`inbox-item ${selected===t.id?"active":""}`} onClick={()=>{setSelected(t.id);setText("");}}>
          <span className="inbox-item-heading"><MessageCircle size={16}/><strong>Cliente web</strong>{t.closed&&<small>Cerrado</small>}</span>
          <span className="inbox-preview">{t.preview}</span>
          <small>{formatTime(t.updatedAt)}</small>
        </button>)}
      </section>
      <section className="admin-card inbox-conversation" aria-label="Conversación seleccionada">
        {!selected||!thread?<div className="inbox-empty"><MessageCircle size={24}/> Seleccioná una conversación para leer y responder.</div>:<>
          <div className="inbox-conversation-header">
            <div><strong>Cliente web</strong><p>{thread.closed?"Conversación finalizada":"Conversación abierta"}</p></div>
            {!thread.closed&&<button type="button" className="inbox-close" disabled={busy} onClick={()=>void close()}><CheckCircle2 size={16}/> Finalizar</button>}
          </div>
          <div className="inbox-messages" aria-live="polite">
            {thread.messages.map(m=><div key={m.id} className={`inbox-bubble ${m.role==="operator"?"mine":""} ${m.role==="bot"?"from-bot":""}`}>
              <small>{m.role==="operator"?(m.by||"Equipo"):m.role==="bot"?"Bot automático":"Cliente"} · {new Date(m.time*1000).toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"})}</small>
              <p>{m.text}</p>
            </div>)}
            <div ref={messageEnd}/>
          </div>
          {!thread.closed&&<form className="inbox-compose" onSubmit={e=>void send(e)}>
            <textarea aria-label="Responder al cliente" placeholder={available?"Escribí tu respuesta…":"Ponete en línea para responder"} value={text} onChange={e=>setText(e.target.value)} maxLength={1000} rows={3} disabled={!available||busy}/>
            <button className="button" type="submit" disabled={!available||busy||!text.trim()}><Send size={17}/> {busy?"Enviando…":"Responder"}</button>
          </form>}
        </>}
      </section>
    </div>
    <div className="admin-hint"><MessageCircle size={17}/><p>Los mensajes se guardan de forma privada en el servidor y se eliminan automáticamente de la lista cuando tienen más de 7 días al recibir nuevas conversaciones. No cierres esta sección si necesitás seguir atendiendo: tu disponibilidad caduca en aproximadamente 45 segundos. Para atención fuera de línea, los visitantes pueden usar WhatsApp.</p></div>
  </>;
}
