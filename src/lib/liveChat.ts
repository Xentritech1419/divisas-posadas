export type LiveMessage={
  id:string;role:"visitor"|"bot"|"operator";text:string;time:number;by?:string;
};
export type LiveThread={id:string;closed:boolean;messages:LiveMessage[]};
export type LiveThreadSummary={id:string;closed:boolean;updatedAt:number;count:number;preview:string};
export type GuestAction="poll"|"start"|"send";

export class LiveChatError extends Error {
  constructor(message:string,public offline=false){super(message);}
}

export async function guestChat(token:string,action:GuestAction,extras:Record<string,unknown>={}):Promise<{online:boolean;thread:LiveThread|null}> {
  const response=await fetch("/api/chat/guest",{
    method:"POST",credentials:"same-origin",cache:"no-store",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({action,token,...extras})
  });
  const data=await response.json() as {online?:boolean;thread?:LiveThread|null;error?:string;offline?:boolean};
  if(!response.ok)throw new LiveChatError(data.error||"No se pudo contactar al chat.",!!data.offline);
  return {online:!!data.online,thread:data.thread??null};
}
export async function getLiveStatus():Promise<boolean>{
  const response=await fetch("/api/chat/status",{cache:"no-store",credentials:"same-origin"});
  if(!response.ok)throw new Error("No se pudo comprobar la disponibilidad.");
  const data=await response.json() as {online:boolean};
  return !!data.online;
}
export function makeGuestToken():string{
  const key="dp-chat-visit-token";
  try{
    const existing=sessionStorage.getItem(key);
    if(existing&&/^[a-f0-9]{64}$/.test(existing))return existing;
  }catch{/* el navegador puede bloquear el almacenamiento */}
  const bytes=crypto.getRandomValues(new Uint8Array(32));
  const token=Array.from(bytes,b=>b.toString(16).padStart(2,"0")).join("");
  try{sessionStorage.setItem(key,token);}catch{/* la sesión actual sigue funcionando */}
  return token;
}
