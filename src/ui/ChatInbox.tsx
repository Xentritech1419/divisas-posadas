"use client";
import {useEffect,useRef,useState} from "react";
import {CheckCircle2,Loader2,MessageCircle,Send,Wifi,WifiOff} from "lucide-react";
import {apiFetch} from "@/lib/api";
import {type LiveThread,type LiveThreadSummary} from "@/lib/liveChat";

async function apiJson<T>(path:string,options?:RequestInit):Promise<T>{
  const response=await apiFetch(path,{cache:"no-store",...options});
  let data: T & {error?:string;ok?:boolean};
  try{data=await response.json() as T & {error?:string;ok?:boolean};}
  catch{throw new Error("El servidor no devolvió una respuesta válida del chat (HTTP "+response.status+"). Comprobá que hayas instalado el ZIP completo en Hostinger.");}
  if(!response.ok)throw new Error(data.error||"No se pudo contactar al chat (HTTP "+response.status+").");
  return data;
}

export default function ChatInbox(){
  const [available,setAvailable]=useState(false);
  const [presenceBusy,setPresenceBusy]=useState(false);
  const [threads,setThreads]=useState<LiveThreadSummary[]>([]);
  const [selected,setSelected]=useState<string|null>(null);
  const [thread,setThread]=useState<LiveThread|null>(null);
  const [text,setText]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(true);
  const clientId=useRef(crypto.randomUUID());
  // Serializa activaciones, renovaciones y desconexiones para evitar peticiones fuera de orden.
  const presenceQueue=useRef<Promise<void>>(Promise.resolve());
  function updatePresence(next:boolean):Promise<{ok:boolean;online:boolean}>{
    const task=presenceQueue.current.then(()=>apiJson<{ok:boolean;online:boolean}>("/api/chat/operator/heartbeat",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({available:next,clientId:clientId.current})
    }));
    presenceQueue.current=task.then(()=>undefined,()=>undefined);
    return task;
  }
  async function changePresence(){
    if(presenceBusy)return;
    setPresenceBusy(true);setError("");
    const next=!available;
    try{
      const confirmed=await updatePresence(next);
      if(!confirmed.ok||(next&&!confirmed.online))throw new Error("Hostinger no confirmó la disponibilidad. Intentá nuevamente.");
      setAvailable(next);
    }catch(e){
      setError(e instanceof Error?e.message:"No se pudo cambiar la disponibilidad.");
    }finally{setPresenceBusy(false);}
  }
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
    let refreshing=false;
    async function renew(){
      if(!active||refreshing)return;
      refreshing=true;
      try{
        const confirmed=await updatePresence(true);
        if(active&&!confirmed.online)throw new Error("El servidor informó que ya no estás en línea.");
      }catch(e){
        if(active){
          setAvailable(false);
          setError(e instanceof Error?e.message:"Se perdió la conexión con el chat. Volvé a ponerte en línea.");
        }
      }finally{refreshing=false;}
    }
    // Mantener la disponibilidad cuando el operador consulta otra pestaña.
    // Los navegadores móviles pueden pausar temporalmente los intervalos.
    const onFocus=()=>void renew();
    const onVisibility=()=>{if(!document.hidden)void renew();};
    const timer=setInterval(()=>void renew(),20000);
    window.addEventListener("focus",onFocus);
    document.addEventListener("visibilitychange",onVisibility);
    return()=>{
      active=false;clearInterval(timer);
      window.removeEventListener("focus",onFocus);
      document.removeEventListener("visibilitychange",onVisibility);
      // Si cerró el panel o eligió desconectarse, solicitar salida inmediata.
      // En cierres bruscos, Hostinger vence la presencia automáticamente.
      void updatePresence(false);
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
        <p>{available?"Conexión confirmada con el servidor. Podés cambiar de sección o pestaña mientras el panel siga abierto.":"Activá la atención cuando puedas responder. Las cotizaciones y el bot siguen funcionando normalmente."}</p>
      </div>
      <button type="button" className={`button inbox-status-button ${available?"inbox-offline-button":""}`}
        disabled={presenceBusy} aria-busy={presenceBusy} onClick={()=>void changePresence()}>
        {presenceBusy?<Loader2 size={17} className="spinning"/>:available?<WifiOff size={17}/>:<Wifi size={17}/>}
        {presenceBusy?"Confirmando con Hostinger…":available?"Ponerme fuera de línea":"Ponerme en línea"}
      </button>
    </div>
    {error&&<div className="admin-alert error" role="alert">{error} <a href="/api/chat/status" target="_blank" rel="noopener noreferrer">Comprobar conexión de chat</a></div>}
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
    <div className="admin-hint"><MessageCircle size={17}/><p>Los mensajes se guardan de forma privada en el servidor y se eliminan automáticamente de la lista cuando tienen más de 7 días al recibir nuevas conversaciones. Podés cambiar de sección del panel o pestaña; mantené el panel abierto y el estado en línea activado. Si el navegador se cierra o suspende, la disponibilidad caduca aproximadamente en 2 minutos. Para atención fuera de línea, los visitantes pueden usar WhatsApp.</p></div>
  </>;
}
