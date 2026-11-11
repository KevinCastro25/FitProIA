import { createClient, SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

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

const rawApi =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
const API_BASE = rawApi.includes("/api/v1")
  ? rawApi.replace(/\/+$/, "")
  : `${rawApi.replace(/\/+$/, "")}/api/v1`;

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
      const { data } = await getSupabase().auth.getSession();
      const token = data.session?.access_token;
      if (token) {
        const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
        headers.set("Authorization", `Bearer ${token}`);
        return originalFetch(input, { ...init, headers });
      }
    }
    return originalFetch(input, init);
  };
}

export async function signOut() {
  if (AUTH_ENABLED) await getSupabase().auth.signOut();
}
