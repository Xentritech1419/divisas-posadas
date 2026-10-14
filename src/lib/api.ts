export type Session = {
  configured: boolean;
  setupEnabled: boolean;
  csrf: string;
  user: { displayName: string; email: string } | null;
};
let csrf = "";
export async function session(): Promise<Session> {
  const response = await fetch("/api/session", { cache: "no-store", credentials: "same-origin" });
  const value = await response.json();
  if (!response.ok) throw new Error(value.error || "No pudimos iniciar la sesión.");
  csrf = value.csrf;
  return value;
}
export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers);
  if (!["GET", "HEAD"].includes((options.method || "GET").toUpperCase())) {
    if (!csrf) await session();
    headers.set("X-CSRF-Token", csrf);
  }
  return fetch(url, { ...options, credentials: "same-origin", headers });
}
export async function authenticate(kind: "login" | "setup", data: Record<string, string>): Promise<Session> {
  const response = await apiFetch(`/api/${kind}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data)
  });
  const value = await response.json();
  if (!response.ok) throw new Error(value.error || "No se pudo completar el acceso.");
  return session();
}
export async function logout(): Promise<void> {
  const response = await apiFetch("/api/logout", { method: "POST" });
  if (!response.ok) throw new Error("No se pudo cerrar la sesión.");
  csrf = "";
  window.location.assign("/admin");
}
export async function backup(): Promise<void> {
  const response = await apiFetch("/api/backup");
  if (!response.ok) throw new Error("Ingresá nuevamente al panel para descargar el respaldo.");
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url; link.download = `divisas-posadas-${new Date().toISOString().slice(0, 10)}.json`;
  link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
