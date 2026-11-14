# SPEC 01 — MVP visual de Arcade Vault (todas las pantallas)

> **Estado:** Implementado
> **Depende de:** ninguna
> **Fecha:** 2026-11-13
> **Objetivo:** Portar a Next.js (App Router) las cinco pantallas de `references/templates/` con datos mock, sin implementar ningún juego real.

---

## Por qué existe este spec

Los templates en `references/templates/` son una SPA en React por CDN con un router casero basado en hash. El proyecto es Next 16 con App Router, y `app/globals.css` ya contiene el tema portado desde `styles.css`. Este spec convierte el prototipo en rutas reales de Next, conservando el diseño tal cual. Como el diseño ya está definido en los templates, no se rediseña nada; `/frontend-design` aplica solo si hay que completar huecos visuales.

---

## Alcance

**Dentro:**

- Layout global con `Nav` (logo, links, contador de créditos, botón de sesión, menú móvil con hamburguesa) y footer, portados de `nav.jsx` y `app.jsx`.
- Pantalla **Biblioteca** (`/`): hero, buscador por nombre, chips de categoría, grilla de `GameCard` con efecto tilt, estado vacío "NO HAY RESULTADOS".
- Pantalla **Detalle de juego** (`/juegos/[id]`): portada, tags, descripción, métricas, botones y leaderboard lateral con las 10 mejores puntuaciones mock.
- Pantalla **Reproductor** (`/juegos/[id]/jugar`): HUD, marco CRT con arena decorativa, puntaje simulado que sube solo, pausa, FIN, modal de fin de juego.
- Pantalla **Salón de la Fama** (`/salon`): pestañas por juego, podio top 3, tabla de 12 filas.
- Pantalla **Auth** (`/auth`): tabs "Iniciar sesión" / "Crear cuenta", formulario, botón de invitado, botones sociales decorativos.
- Datos mock tipados en `lib/games.ts` (de `data.jsx`).
- Guardado de la puntuación del modal en `localStorage` (clave `av_scores`), igual que el template.
- Responsive según `globals.css` (menú móvil incluido).

**Fuera de alcance (para otros specs):**

- Cualquier juego jugable real (Bloque Buster, Caída, etc.). El reproductor es solo una simulación.
- Sesión de usuario: el formulario de Auth **no** crea sesión. El nav siempre muestra "Iniciar Sesión".
- Backend, base de datos, API routes o route handlers.
- OAuth real (Google/GitHub); los botones son decorativos.
- Leer o mostrar las puntuaciones guardadas en `av_scores` (solo se escriben).
- Fila "Tu mejor marca" del Salón (depende de tener sesión).
- Tests automatizados (no hay runner configurado).

---

## Modelo de datos

Estructuras nuevas, tipadas, en `lib/games.ts`. Se portan de `data.jsx` sin cambiar contenido.

```ts
export type Category = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type AccentColor = "cyan" | "magenta" | "yellow" | "green";

export interface Game {
  id: string;        // slug de la URL, ej. "bloque-buster"
  title: string;
  short: string;     // descripción corta para la card
  long: string;      // descripción larga para el detalle
  cat: Category;
  cover: string;     // clase CSS de globals.css, ej. "cover-bricks"
  color: AccentColor;
  best: number;      // mejor puntuación global (mock)
  plays: string;     // ej. "12.4K"
}

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string;      // "dd/mm/2026"
}

export const GAMES: Game[];                       // los 8 juegos del template
export const CATS: ["TODOS", ...Category[]];
export function seededScores(seed: number, count?: number): ScoreRow[]; // determinista
```

Persistencia (única): `localStorage["av_scores"]` guarda un array de `{ game: string, score: number, name: string, at: number }`. Solo se escribe, dentro de un `try/catch`.

Convenciones:

- Números formateados con `toLocaleString("es-ES")`.
- Las semillas de `seededScores` se mantienen idénticas al template (`id.length * 17 + 3` en detalle, `tab.length * 23 + 7` en salón) para que el resultado sea el mismo y el render no cambie entre servidor y cliente.

---

## Plan de implementación

Antes del paso 1: leer en `node_modules/next/dist/docs/` lo relativo a rutas dinámicas, `generateStaticParams`, Client Components y `cacheComponents` (ver CLAUDE.md).

1. Crear `lib/games.ts` con tipos, `GAMES`, `CATS` y `seededScores`. Verificación: `npm run lint` y `npx tsc --noEmit` sin errores.
2. Crear `components/nav.tsx` (Client Component, estado del menú móvil, link activo según `usePathname`) y `components/footer.tsx`. Integrarlos en `app/layout.tsx`, manteniendo `av-bg` y `av-noise`. Verificación: `npm run dev`, el nav se ve y el menú móvil abre y cierra.
3. Biblioteca: crear `components/game-card.tsx` (Client Component con tilt) y `components/library.tsx` (Client Component con buscador y chips). Reemplazar `app/page.tsx`. Verificación: filtrar por texto y categoría; el vacío muestra "NO HAY RESULTADOS".
4. Detalle: crear `app/juegos/[id]/page.tsx` con `generateStaticParams` sobre `GAMES` y `notFound()` si el id no existe. Verificación: click en una card lleva a `/juegos/bloque-buster` con leaderboard.
5. Salón: crear `app/salon/page.tsx` y `components/hall-of-fame.tsx` (Client Component con pestañas, podio y tabla, sin fila "tú"). Verificación: cambiar de pestaña cambia podio y tabla.
6. Auth: crear `app/auth/page.tsx` y `components/auth-form.tsx` (Client Component). Enviar el form o pulsar "Jugar como invitado" navega a `/` con `useRouter`. Verificación: ambos botones llevan a la biblioteca y el nav sigue mostrando "Iniciar Sesión".
7. Reproductor: crear `app/juegos/[id]/jugar/page.tsx` y `components/game-player.tsx` (Client Component) con HUD, CRT, puntaje simulado, pausa, FIN, modal y guardado en `av_scores`. El nombre por defecto es `INVITADO`. Verificación: puntaje sube, pausa lo detiene, FIN abre el modal, guardar escribe en `localStorage`.
8. Revisión final de enlaces: "SALIR" vuelve a `/juegos/[id]`, "VOLVER AL VAULT" a `/`, "VOLVER A LA BIBLIOTECA" a `/`. Ejecutar `npm run build`.

---

## Criterios de aceptación

- [ ] `npm run lint` y `npm run build` terminan sin errores.
- [ ] La consola del navegador no muestra errores ni avisos de hidratación en ninguna de las 5 rutas.
- [ ] `/` muestra 8 cards; escribir "serp" deja solo SERPENTINA.
- [ ] Elegir el chip PUZZLE deja solo CAÍDA; una búsqueda sin coincidencias muestra "NO HAY RESULTADOS".
- [ ] Hacer click en una card o en su botón JUGAR navega a `/juegos/<id>`.
- [ ] `/juegos/<id>` muestra título, categoría, descripción larga, 3 métricas y 10 filas de leaderboard con el top 3 diferenciado.
- [ ] `/juegos/no-existe` devuelve la página 404 de Next.
- [ ] "▶ JUGAR AHORA" navega a `/juegos/<id>/jugar`.
- [ ] En el reproductor, el puntaje aumenta cada ~220 ms; PAUSA lo detiene y muestra "EN PAUSA"; REANUDAR lo retoma.
- [ ] FIN abre el modal con la puntuación final; "GUARDAR PUNTUACIÓN" agrega un registro a `localStorage["av_scores"]` y muestra "PUNTUACIÓN GUARDADA".
- [ ] "JUGAR DE NUEVO" reinicia puntaje, vidas y nivel; "SALIR" vuelve al detalle del mismo juego.
- [ ] `/salon` muestra una pestaña por cada uno de los 8 juegos; cada una muestra podio de 3 y tabla de 12 filas.
- [ ] `/auth` alterna entre las tabs; "Correo electrónico" aparece solo en "Crear cuenta".
- [ ] Enviar el formulario de `/auth` o pulsar "Jugar como invitado" navega a `/`, y el nav sigue mostrando "Iniciar Sesión".
- [ ] El link activo del nav se resalta correctamente en `/`, `/juegos/*` (Biblioteca) y `/salon`.
- [ ] En ancho ≤ 768 px aparece el botón hamburguesa y abre el panel móvil con los links.
- [ ] Recargar `/salon` produce los mismos nombres y puntajes (datos deterministas).

---

## Decisiones tomadas y descartadas

- **Sí:** rutas reales de App Router (`/`, `/juegos/[id]`, `/juegos/[id]/jugar`, `/salon`, `/auth`). URLs compartibles y uso idiomático de Next.
- **No:** SPA con router por hash como en el template. Desaprovecha Next y rompe la navegación nativa.
- **Sí:** auth solo visual, sin sesión. Evita inventar un modelo de usuario antes de que exista backend.
- **No:** sesión mock en `localStorage` (`av_user`). Se evaluó, se descartó por decisión del usuario; si hace falta sesión, va en otro spec con backend real.
- **Sí:** simulación del template en el reproductor (puntaje aleatorio, pausa, game over). Permite validar el flujo completo del modal de puntuación sin ningún juego.
- **Sí:** datos mock tipados en `lib/games.ts`. Es la fuente única hasta que exista una base de datos.
- **No:** route handlers mock. Complejidad sin valor visual.
- **Sí:** Client Components solo donde hay estado o eventos (nav, filtros, tilt, pestañas, auth, reproductor). Las páginas siguen siendo Server Components.
- **Sí:** conservar `globals.css` y las clases CSS del template. No se reescribe con utilidades de Tailwind.
- **Sí:** el `localStorage` de `av_scores` solo se escribe, no se lee, porque ninguna pantalla del alcance lo consume.

---

## Riesgos identificados

| Riesgo | Mitigación |
| --- | --- |
| `cacheComponents` exige tratar bien los params dinámicos de `[id]` | Usar `generateStaticParams` y revisar la guía de rutas dinámicas en `node_modules/next/dist/docs/` antes del paso 4. |
| Hidratación: `Math.random` en el reproductor o `toLocaleString` pueden diferir entre servidor y cliente | El puntaje inicia en 0 y aumenta solo tras montar en `useEffect`. Formatear siempre con locale fijo `es-ES`. |
| `localStorage` no disponible (modo privado) | Envolver en `try/catch` y seguir sin persistir. |
| Diferencias de fuentes entre el template (CDN) y `next/font` | Ya resuelto en `app/layout.tsx` con variables CSS; verificar visualmente contra `Arcade Vault.html`. |

---

## Qué **no** entra en este spec

- Juegos jugables reales (cada uno tendrá su propio spec).
- Sesión de usuario, registro real, OAuth o cualquier backend.
- Lectura de puntuaciones guardadas y fila "Tu mejor marca" en el Salón.
- Ranking real compartido entre jugadores.
- Tests automatizados.
