# NÓS / NOSOTROS — plan de arranque (listo para el día 1)

App privado de reconexión de pareja. Programa de 30 días.
Stack: **Next.js 14 (App Router) · Supabase (Auth + Postgres + Realtime) · Tailwind · Framer Motion · next-intl · PWA · Vercel.**
Idioma de la UI: **español** (base i18n lista por si llega a producto).

---

## Qué significa "listo para el día 1"

No hace falta todo. El app puede **crecer junto con los 30 días**:

| Fase | Qué incluye | ¿Necesario el día 1? |
|------|-------------|----------------------|
| 0 · Fundación | Proyecto Supabase + `nos-schema.sql` + scaffold Next.js + deploy en Vercel | Sí |
| 1 · Acceso + pacto | Login magic-link, crear/unirse a la pareja por invitación, firmar el pacto | Sí |
| 2 · Ritual "Hoy" | Termómetro, pregunta del día, gesto, **revelación al completar los dos**, comentarios | Sí |
| 3 · Progreso | Gráfico de tendencia, constancia, ratio aprecio:fricción | Días 2-3 |
| 4 · Sugerencias → acuerdos | Proponer / aceptar / rechazar / contraproponer; acuerdos en el pacto | Días 3-5 |
| 5 · Reflexión semanal | El "ciclo": disparador, emoción primaria, necesidad | Antes del día 8 |

**Día 1 = Fases 0 + 1 + 2.** Realista para hoy/esta noche con Claude Code en tu flujo (tú apruebas cada diff antes del commit).

---

## Paso 0 — fundación (manual, 15-20 min)

1. Crear proyecto en Supabase (o reutilizar uno). Copiar `URL` y `anon key`.
2. SQL Editor → pegar y ejecutar **`nos-schema.sql`** entero.
3. Authentication → Email → activar **Magic Link**. (Si quieres invitar por WhatsApp, basta compartir el enlace de invitación; el login es por correo.)
4. Crear repo en GitHub bajo la cuenta correcta y verificar el perfil de VS Code antes del primer push.

---

## Prompt 1 para Claude Code — scaffold + acceso + pacto

> Crea un proyecto **Next.js 14 con App Router, TypeScript, Tailwind y next-intl** (locale por defecto `es`, estructura lista para añadir `pt`/`en`). Todo el texto de la UI en **español**.
>
> Integra **Supabase** con `@supabase/ssr` (cliente de servidor y de navegador, lee `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` de `.env.local`).
>
> Flujo de acceso (magic link):
> 1. `/login`: input de correo + nombre, envía magic link. Tras volver, si el perfil no tiene `couple_id`, redirige a `/onboarding`.
> 2. `/onboarding`: dos caminos — **“Crear nuestro espacio”** (llama al RPC `create_couple`, muestra el `invite_code` y un botón “Compartir invitación” que abre WhatsApp con el enlace `https://APP/join/CODE`) y **“Unirme con un código”** (campo de código → RPC `join_couple`).
> 3. `/join/[code]`: si hay sesión, llama a `join_couple`; si no, manda a `/login` guardando el código.
> 4. Tras tener pareja, `/pacto`: muestra `pact_text`, un botón **“Firmo este pacto”** que setea `pact_signed_a` o `pact_signed_b` según `member_slot`. Cuando ambos firmaron, botón **“Empezar”** → `/hoy`.
>
> Usa los nombres de tabla/función exactamente como en `nos-schema.sql`. Diseño limpio, cálido, mobile-first; sin formularios `<form>` nativos en componentes cliente, usa handlers. Confírmame el diff antes de commit.

---

## Prompt 2 para Claude Code — pantalla "Hoy" (el ritual)

> Crea `/hoy`. Calcula el **día actual del programa** = `(current_date − couples.start_date) + 1`, acotado a 1-30; carga la fila de `program_days` correspondiente.
>
> La pantalla tiene cuatro pasos, todos en **español**:
> 1. **Termómetro**: slider 0-10 de “¿cómo siento la conexión hoy?” + selector de ánimo. Guarda en `entries` (upsert por `couple_id,user_id,day_number`). El valor del otro **no se muestra todavía**.
> 2. **Pregunta del día**: muestra `question_es`; textarea que guarda `reflection_es`.
> 3. **Gesto**: muestra `gesture_es` con un check que setea `gesture_done`.
> 4. **Revelación**: solo cuando **ambos** miembros tienen entrada de ese día con `reflection_es` no vacío, se muestran las dos respuestas lado a lado y se habilitan **comentarios** (`comments`). Antes de eso, un estado bloqueado: “Se revela cuando los dos respondan”.
>
> Suscríbete con **Supabase Realtime** a `entries` y `comments` de la pareja para que la revelación y los comentarios aparezcan en vivo. Muestra arriba la “constancia” (días seguidos en que ambos completaron). Barra de navegación inferior: Hoy · Conversación · Pacto · Progreso (las dos últimas pueden ir como placeholders por ahora). Mobile-first, Framer Motion para la revelación. Confírmame el diff antes de commit.

---

## Texto del pacto (ya viene como default en la base, editable)

> Durante 30 días elegimos quedarnos. Pase lo que pase, cada día entramos aquí,
> nos contamos cómo nos sentimos de verdad y damos un paso para acercarnos.
> Sin orgullo de por medio, sin dejar que la rutina decida por nosotros.

---

## Lo que sigue (te lo preparo enseguida)

- **Semilla de los días 8-30** (semanas 2-4): mismo formato que la semana 1 ya sembrada, con la profundidad creciente (reconocer → el ciclo → construir).
- **Prompt 3**: pantalla de Progreso (tendencia de conexión, constancia, ratio aprecio:fricción) — pensada como *espejo*, no como nota.
- **Prompt 4**: sugerencias → acuerdos.
- **Prompt 5**: reflexión semanal del ciclo.

> Nota de cuidado, no técnica: el progreso se diseña como espejo para conversar, nunca como un puntaje para reprochar. Un día flojo no “reprueba” a nadie. Eso está incrustado en el diseño a propósito.
