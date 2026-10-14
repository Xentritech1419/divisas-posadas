import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { ArrowLeft, LockKeyhole, Loader2 } from "lucide-react";
import Landing from "./ui/Landing";
import Admin from "./ui/Admin";
import { Brand } from "./ui/Brand";
import { contentSchema, defaultContent, type ContentState } from "./lib/content";
import { authenticate, session, type Session } from "./lib/api";
import "./styles.css";

function Login({ access, onLogin }: { access: Session; onLogin: (value: Session) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const setup = !access.configured;
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget).entries()) as Record<string, string>;
    if (setup && values.password !== values.confirm) { setError("Las contraseñas no coinciden."); return; }
    setBusy(true);
    try { onLogin(await authenticate(setup ? "setup" : "login", values)); }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudo iniciar sesión."); }
    finally { setBusy(false); }
  }
  return <main className="auth-page"><section className="auth-card">
    <Brand content={defaultContent}/><span className="auth-emblem"><LockKeyhole size={25}/></span>
    <h1>{setup ? "Activá tu administración" : "Bienvenido de nuevo"}</h1>
    <p>{setup ? "Creá la cuenta con la que vas a administrar Divisas Posadas." : "Ingresá para actualizar tus cotizaciones, ofertas y contenido."}</p>
    {setup && !access.setupEnabled ? <div className="notice"><strong>Falta habilitar la instalación.</strong><p>Seguí los pasos del archivo INSTALAR_HOSTINGER.md incluido en el proyecto. Después recargá esta página.</p></div> :
    <form onSubmit={submit}>
      <fieldset disabled={busy}>
        {setup && <><label className="admin-field"><span>Código de instalación</span><input name="setupKey" type="password" required autoComplete="off" minLength={24}/></label><label className="admin-field"><span>Tu nombre</span><input name="displayName" required maxLength={80} autoComplete="name"/></label></>}
        <label className="admin-field"><span>Correo electrónico</span><input name="email" type="email" required maxLength={200} autoComplete="username"/></label>
        <label className="admin-field"><span>Contraseña</span><input name="password" type="password" required minLength={setup ? 12 : 1} maxLength={72} autoComplete={setup ? "new-password" : "current-password"}/>{setup && <small>Usá al menos 12 caracteres.</small>}</label>
        {setup && <label className="admin-field"><span>Repetí la contraseña</span><input name="confirm" type="password" required minLength={12} maxLength={72} autoComplete="new-password"/></label>}
        {error && <p className="admin-alert error" role="alert">{error}</p>}
        <button type="submit" className="button">{busy && <Loader2 size={17} className="spinning"/>}{busy ? "Un momento…" : setup ? "Crear mi cuenta" : "Ingresar al panel"}</button>
      </fieldset>
    </form>}
    <a href="/" className="auth-back"><ArrowLeft size={15}/> Volver a la landing</a>
  </section></main>;
}
function App() {
  const [state, setState] = useState<ContentState | null>(null);
  const [access, setAccess] = useState<Session | null>(null);
  const [error, setError] = useState("");
  const isAdmin = /^\/admin\/?$/.test(window.location.pathname);
  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch("/api/content", { cache: "no-store" }).then(async r => {
        const data = await r.json();
        if (!r.ok || !contentSchema.safeParse(data.content).success) throw new Error("No pudimos cargar las cotizaciones. Intentá nuevamente.");
        return data as ContentState;
      }),
      isAdmin ? session() : Promise.resolve(null)
    ]).then(([content, account]) => { if (alive) { setState(content); setAccess(account); document.title = `${content.content.brand.name} | ${isAdmin ? "Administración" : content.content.brand.tagline}`; } })
      .catch(e => { if (alive) setError(e instanceof Error ? e.message : "No pudimos cargar el sitio."); });
    return () => { alive = false; };
  }, [isAdmin]);
  if (error) return <main className="access-error"><h1>No pudimos cargar el sitio</h1><p>{error}</p><button className="button" onClick={() => window.location.reload()}>Volver a intentar</button></main>;
  if (!state || (isAdmin && !access)) return <main className="access-error" role="status"><Loader2 className="spinning"/><p>Cargando Divisas Posadas…</p></main>;
  if (isAdmin && access) return access.user ? <Admin initialState={state} displayName={access.user.displayName} role={access.user.role}/> : <Login access={access} onLogin={setAccess}/>;
  if (window.location.pathname !== "/") return <main className="access-error"><h1>Página no encontrada</h1><a className="button" href="/">Ir al inicio</a></main>;
  return <Landing initialState={state}/>;
}
createRoot(document.getElementById("root")!).render(<App/>);
