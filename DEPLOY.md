# Despliegue de FitProIA: Supabase + Render + Vercel

Orden recomendado. Tiempo estimado: 30–40 min.

## 1. Supabase (base de datos + login)

1. Crea un proyecto en https://supabase.com.
2. **Base de datos:** el backend crea las tablas por sí solo al arrancar (`create_all`). No hace falta ejecutar los `.sql` de `supabase/migrations` (son referencia).
3. Copia desde *Project Settings → API*: **Project URL** y la clave **anon public**.
4. Copia la cadena de conexión: *Connect → Session pooler* (puerto 5432). Sustituye `[YOUR-PASSWORD]`.
5. **Auth → Providers:**
   - *Email*: activado por defecto. Para pruebas rápidas puedes desactivar "Confirm email".
   - *Google*: crea credenciales OAuth en Google Cloud Console (tipo "Web"), con el redirect `https://<tu-proyecto>.supabase.co/auth/v1/callback`, y pega Client ID y Secret.
   - *Apple*: requiere cuenta Apple Developer de pago (US$99/año). Puedes dejarlo para después; el botón mostrará un error hasta configurarlo.
6. **Auth → URL Configuration:** *Site URL* = URL de Vercel (paso 3). Añade también `http://localhost:3000` en *Redirect URLs*.

## 2. Render (backend FastAPI)

1. Sube el repo a GitHub.
2. En Render: *New → Blueprint* y elige el repo (usa `render.yaml`).
3. Variables a completar en el panel:
   | Variable | Valor |
   |---|---|
   | `DATABASE_URL` | cadena del Session pooler de Supabase |
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
   | `SUPABASE_ANON_KEY` | clave anon |
   | `GEMINI_API_KEY` | tu clave de Google AI Studio |
   | `CORS_ORIGINS` | URL de Vercel, sin `/` final |
4. Verifica `https://<tu-servicio>.onrender.com/health` y `/docs`.

> El plan gratuito de Render "duerme" tras ~15 min sin tráfico; la primera petición tarda ~30–60 s. Para uso diario conviene el plan de pago (Starter).

## 3. Vercel (frontend PWA)

1. *Add New Project* → mismo repo → **Root Directory: `frontend`**.
2. Variables:
   | Variable | Valor |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | `https://<tu-servicio>.onrender.com/api/v1` |
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clave anon |
3. Despliega, copia la URL y vuelve a poner esa URL en `CORS_ORIGINS` (Render) y *Site URL* (Supabase).

## 4. iPhone

Abre la URL de Vercel en **Safari** → Compartir → **Añadir a pantalla de inicio**. Inicia sesión una vez dentro de la app instalada.

## Desarrollo local

Sin variables de Supabase la app corre en **modo demo** (sin login, usuario `atleta@fitproia.co`). Para probar el login real en local, crea `frontend/.env.local` con las 3 variables `NEXT_PUBLIC_*` y `backend/.env` con `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_ANON_KEY` y `REQUIRE_AUTH=true`.
