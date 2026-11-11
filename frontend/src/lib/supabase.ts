import { createClient, SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://jddtzjqsoktcthxbxhbh.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_fNyIXvq_tMeEQnJ6puxztQ_waSvVow4";

/** true si Supabase Auth está configurado; si no, la app corre en modo demo local sin login. */
export const AUTH_ENABLED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true, // sesión persistente en la PWA
        autoRefreshToken: true,
        detectSessionInUrl: true, // retorno de OAuth (Google/Apple)
      },
    });
  }
  return client;
}

export function resolveApiBase(): string {
  const env = (process.env.NEXT_PUBLIC_API_URL || "").trim();
  if (env && !env.includes("localhost:8000")) {
    return env.includes("/api/v1")
      ? env.replace(/\/+$/, "")
      : `${env.replace(/\/+$/, "")}/api/v1`;
  }
  // En cualquier entorno que no sea localhost explícito, usar la API de Render
  if (typeof window !== "undefined") {
    const h = window.location.hostname;
    if (h === "localhost" || h === "127.0.0.1") {
      return env || "http://localhost:8000/api/v1";
    }
  }
  return "https://fitproia.onrender.com/api/v1";
}

export const API_BASE = resolveApiBase();

let fetchPatched = false;

/**
 * Adjunta `Authorization: Bearer <access_token>` a todas las peticiones hacia la API de FitProIA,
 * de modo que cada componente siga usando `fetch(API_BASE...)` sin cambios.
 */
export function installAuthFetch() {
  if (fetchPatched || typeof window === "undefined" || !AUTH_ENABLED) return;
  fetchPatched = true;
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
        ? input.href
        : input.url;
    const isApiCall =
      url.includes("/api/v1") ||
      (API_BASE && url.startsWith(API_BASE)) ||
      url.includes("onrender.com") ||
      url.includes("localhost:8000");
    if (isApiCall) {
      try {
        const { data } = await getSupabase().auth.getSession();
        const token = data.session?.access_token;
        if (token) {
          const headers = new Headers(
            init?.headers ??
              (input instanceof Request ? input.headers : undefined)
          );
          headers.set("Authorization", `Bearer ${token}`);
          return originalFetch(input, { ...init, headers });
        }
      } catch (err) {
        console.warn("Fallo obteniendo sesión para header Bearer:", err);
      }
    }
    return originalFetch(input, init);
  };
}

// Inicializar interceptor de inmediato en el navegador
if (typeof window !== "undefined") {
  installAuthFetch();
}

export async function getAuthHeaders(): Promise<Record<string, string>> {
  if (!AUTH_ENABLED) return {};
  try {
    const { data } = await getSupabase().auth.getSession();
    const token = data.session?.access_token;
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
  } catch {}
  return {};
}

export async function signOut() {
  if (AUTH_ENABLED) await getSupabase().auth.signOut();
}
