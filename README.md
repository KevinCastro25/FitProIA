# FitProIA — PWA de Recomposición Corporal y Rendimiento Híbrido (Gym + Running / Hyrox)

Aplicación web progresiva (**PWA**) diseñada para instalarse en **iPhone (Safari Standalone)** y Android, enfocada en **reducir el porcentaje de grasa corporal conservando o aumentando la masa muscular magra y el rendimiento deportivo**.

## Estructura del Proyecto

- [`frontend/`](./frontend): Aplicación **Next.js 15 + React 19 + TypeScript + Tailwind CSS** con `manifest.json`, Service Worker (`sw.js`), soporte de Safe Areas para iPhone (`viewport-fit=cover`), Wake Lock para el gimnasio y cola offline en **IndexedDB**.
- [`backend/`](./backend): API REST en **Python + FastAPI + SQLAlchemy 2.0** con motor fisiológico (`Katch-McArdle` / `Mifflin-St Jeor`), catálogo semilla de **alimentos y platos típicos colombianos**, motor de valoración automática de chequeos corporales y pruebas automatizadas (`pytest`).
- [`supabase/migrations/001_init_fitproia.sql`](./supabase/migrations/001_init_fitproia.sql): Script SQL completo listo para ejecutar en el **SQL Editor de Supabase** (`PostgreSQL + pg_trgm`).

---

## Ejecución Local Rápida (Windows)

### 1. Levantar el Backend (FastAPI)
```powershell
cd backend
.\.venv\Scripts\uvicorn.exe app.main:app --reload --port 8000
```
- Documentación interactiva OpenAPI (Swagger): `http://localhost:8000/docs`

### 2. Levantar el Frontend PWA (Next.js)
```powershell
cd frontend
npm run dev
```
- Abrir en navegador o simulador móvil: `http://localhost:3000`

---

## Despliegue en Vercel + Supabase

1. **Base de datos en Supabase**:
   - Crea un proyecto en Supabase y ejecuta el contenido de [`supabase/migrations/001_init_fitproia.sql`](./supabase/migrations/001_init_fitproia.sql) en el **SQL Editor**.
   - Copia tu cadena de conexión `DATABASE_URL` (`postgresql://...`).
2. **Despliegue en Vercel**:
   - Importa el repositorio en Vercel seleccionando el directorio `frontend` para la PWA y configura `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `GEMINI_API_KEY`.
3. **Instalación en tu iPhone**:
   - Abre la URL HTTPS de Vercel en **Safari (iOS)** → toca el ícono **Compartir** → selecciona **"Añadir a la pantalla de inicio"**.
