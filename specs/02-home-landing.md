# SPEC 02 — Home (landing) de Arcade Vault

> **Estado:** Aprobado
> **Depende de:** SPEC 01
> **Fecha:** 2026-11-13
> **Objetivo:** Portar la landing de `references/templates/home-about/home.jsx` a Next.js como la ruta `/`, moviendo la Biblioteca a `/juegos`.

---

## Por qué existe este spec

SPEC 01 dejó la Biblioteca en `/`. El template `home-about` añade una landing (hero, features, preview de juegos, stats, actividad en vivo, precios y CTA final) que debe ser la puerta de entrada. Eso obliga a mover la Biblioteca a `/juegos` y a actualizar todos los enlaces que apuntaban a `/`. El diseño ya está definido en `references/templates/home-about/`; no se rediseña, se porta. `/frontend-design` aplica solo si hay que completar huecos visuales.

---

## Alcance

**Dentro:**

- Nueva pantalla **Home** en `/` con las secciones del template: hero con siluetas flotantes, "¿POR QUÉ ARCADE VAULT?" (4 feature cards), "JUEGOS DISPONIBLES AHORA" (6 mini cards), stats, "ACTIVIDAD EN VIVO" (últimas puntuaciones + top de hoy), "PRECIOS" con FAQ y CTA final.
- Animación de aparición al hacer scroll (`.reveal` / `.in`) con `IntersectionObserver`.
- Mover la Biblioteca de `/` a `/juegos` (`app/juegos/page.tsx`), sin cambiar su contenido.
- Nav: añadir el link "Inicio" (`/`) antes de "Biblioteca" (`/juegos`), en barra y panel móvil. El logo sigue apuntando a `/`.
- Actualizar los enlaces que hoy apuntan a `/` para que sigan llegando a la Biblioteca (ver plan, paso 2).
- Portar a `app/globals.css` los estilos de `home` desde `references/templates/home-about/styles.css` (bloques `HOME PAGE`, `ACTIVITY` y `PRICING`).
- Datos mock estáticos en `lib/home.ts`.

**Fuera de alcance (para otros specs):**

- Pantalla "Acerca de" y formulario de contacto (`about.jsx`). El nav **no** muestra "Acerca de".
- Sesión de usuario, backend, estadísticas o actividad reales.
- Datos de actividad derivados de `GAMES` o de `av_scores`.
- Cambios de diseño sobre el template.
- Tests automatizados.

---

## Modelo de datos

Estructuras nuevas, tipadas, en `lib/home.ts`. Se portan del template sin cambiar el contenido.

```ts
import type { AccentColor } from "@/lib/games";

export interface Feature {
  icon: "GAMEPAD" | "FREE" | "TROPHY" | "ROCKET";
  title: string;
  desc: string;
  color: AccentColor;
}

export interface Stat { n: string; u: string; s: string; }

export interface RecentScore {
  player: string;
  game: string;      // texto libre, tal cual el template
  score: number;
  when: string;      // "hace 2 min"
  color: AccentColor;
}

export interface TopPlayer { rank: number; player: string; score: number; }

export interface Faq { q: string; a: string; }

export const FEATURES: Feature[];       // 4
export const STATS: Stat[];             // 3
export const RECENT_SCORES: RecentScore[]; // 7
export const TOP_PLAYERS: TopPlayer[];  // 5
export const PRICE_PERKS: string[];     // 6 ítems de la lista del plan
export const FAQS: Faq[];               // 3
```

La preview de juegos reutiliza `GAMES.slice(0, 6)` de `lib/games.ts`. No hay persistencia nueva.

Convenciones:

- Números con `toLocaleString("es-ES")`.
- El ancho de `tp-fill` es `100 - index * 16` (%), igual que el template.
- Los datos son estáticos: sin `Math.random` ni `Date`, para que no haya diferencias de hidratación.

---

## Plan de implementación

Antes del paso 1: leer en `node_modules/next/dist/docs/` lo relativo a `Link`, Client Components y `cacheComponents` (ver CLAUDE.md).

1. Crear `lib/home.ts` con los tipos y las constantes. Verificación: `npx tsc --noEmit` y `npm run lint` sin errores.
2. Mover la Biblioteca: crear `app/juegos/page.tsx` con `<Library />` y actualizar enlaces: `href="/"` → `href="/juegos"` en `app/juegos/[id]/page.tsx` (VOLVER A LA BIBLIOTECA), `components/game-player.tsx` (VOLVER AL VAULT), `components/hall-of-fame.tsx` y `router.push("/")` → `router.push("/juegos")` en `components/auth-form.tsx` (2 sitios). `app/page.tsx` queda temporalmente sin cambios. Verificación: `/juegos` muestra las 8 cards y los botones de vuelta llegan a `/juegos`.
3. Actualizar `components/nav.tsx`: `isHome = pathname === "/"`, `isLibrary = pathname.startsWith("/juegos")`; añadir "Inicio" (`/`) y apuntar "Biblioteca" a `/juegos`, en barra y panel móvil. Verificación: el link activo es correcto en `/`, `/juegos`, `/juegos/<id>` y `/salon`.
4. Portar estilos: copiar a `app/globals.css` los bloques `HOME PAGE`, `ACTIVITY` y `PRICING` del template, sin duplicar reglas ya existentes (`.fade-in`, `.btn`, `.neon-*`). Verificación: `npm run dev` sin errores de CSS; `/` sigue cargando.
5. Crear `components/reveal.tsx` (Client Component): hook/wrapper con `IntersectionObserver` (threshold 0.12) que añade la clase `in` a los elementos `.reveal` y desconecta al desmontar. Verificación: lint y tipos sin errores.
6. Crear `components/home/floating-silhouettes.tsx` (8 SVG decorativos, `aria-hidden`) y `components/home/feature-icon.tsx` (4 iconos pixel). Server Components. Verificación: tipos y lint sin errores.
7. Reemplazar `app/page.tsx` por la Home: hero (eyebrow, título de 3 líneas, subtítulo, CTAs "EXPLORAR JUEGOS" → `/juegos` y "CREAR CUENTA" → `/auth`, indicador "DESLIZA") y sección "¿POR QUÉ ARCADE VAULT?". Usar `Link` con clases `btn`. Verificación: `/` muestra hero y 4 feature cards; ambos CTA navegan bien.
8. Añadir "JUEGOS DISPONIBLES AHORA": `components/home/mini-card.tsx` (`Link` a `/juegos/<id>`) y botón "VER TODOS LOS JUEGOS →" a `/juegos`. Verificación: 6 mini cards; click lleva al detalle.
9. Añadir stats y "ACTIVIDAD EN VIVO" (ticker de 7 filas con `animationDelay`, top 5 con barras y "VER SALÓN →" a `/salon`). Verificación: las filas y barras se ven como en el template.
10. Añadir "PRECIOS" (plan, lista, FAQ, "EMPEZAR GRATIS →" a `/auth`) y CTA final ("INSERTAR MONEDA →" a `/juegos`). Aplicar `.reveal` a las secciones según el template. Verificación: las secciones aparecen al hacer scroll.
11. Revisión final: comparar `/` con `arcade-vault-standalone.html` en escritorio y móvil, buscar enlaces residuales a `/` que debieran ir a `/juegos`, y ejecutar `npm run lint` y `npm run build`.

---

## Criterios de aceptación

- [ ] `npm run lint` y `npm run build` terminan sin errores.
- [ ] La consola del navegador no muestra errores ni avisos de hidratación en `/`, `/juegos`, `/juegos/<id>`, `/salon` y `/auth`.
- [ ] `/` muestra el hero con el título "EL ARCADE CLÁSICO ESTÁ DE VUELTA" y 8 siluetas decorativas.
- [ ] "EXPLORAR JUEGOS" navega a `/juegos` y "CREAR CUENTA" navega a `/auth`.
- [ ] `/` muestra 4 feature cards, 6 mini cards, 3 stats, 7 filas de últimas puntuaciones y 5 del top de hoy.
- [ ] Click en una mini card navega a `/juegos/<id>` del mismo juego.
- [ ] "VER TODOS LOS JUEGOS →" e "INSERTAR MONEDA →" navegan a `/juegos`; "VER SALÓN →" navega a `/salon`; "EMPEZAR GRATIS →" navega a `/auth`.
- [ ] Las filas del top muestran barras de 100 %, 84 %, 68 %, 52 % y 36 % de ancho, y las 3 primeras tienen estilo diferenciado.
- [ ] Las secciones con `.reveal` reciben la clase `in` al entrar en el viewport.
- [ ] `/juegos` muestra la Biblioteca con 8 cards, y la búsqueda y los chips funcionan como en SPEC 01.
- [ ] "VOLVER A LA BIBLIOTECA" (detalle y Salón), "VOLVER AL VAULT" (reproductor) y el envío o "Jugar como invitado" de `/auth` llevan a `/juegos`.
- [ ] El nav muestra "Inicio", "Biblioteca" y "Salón de la Fama", y no muestra "Acerca de".
- [ ] El link activo es "Inicio" solo en `/`, "Biblioteca" en `/juegos` y `/juegos/*`, y "Salón de la Fama" en `/salon`.
- [ ] En ancho ≤ 768 px aparece la hamburguesa y el panel móvil incluye "Inicio".
- [ ] Recargar `/` produce el mismo contenido (sin datos aleatorios).

---

## Decisiones tomadas y descartadas

- **Sí:** Home en `/` y Biblioteca en `/juegos`. Es el comportamiento del template (Inicio y Biblioteca separados) y la URL `/juegos` ya es el prefijo de las rutas de juego.
- **No:** Home en `/inicio` con la Biblioteca en `/`. Deja la raíz sin landing.
- **Sí:** solo Home en este spec. Pedido explícito del usuario; "Acerca de" y contacto van en otro spec.
- **Sí:** datos de actividad y stats como mock estático en `lib/home.ts`. Conserva el contenido del template y evita hidratación inconsistente.
- **No:** derivar la actividad de `GAMES` o `seededScores`. Cambiaría el contenido del template sin aportar valor.
- **Sí:** el flujo de Auth termina en `/juegos`, no en la Home. Mantiene la intención de SPEC 01 (llevar a la Biblioteca).
- **Sí:** solo `Reveal` es Client Component; el resto de la Home son Server Components con `Link`. Los `onClick` + `navigate` del template pasan a enlaces reales.
- **Sí:** portar CSS tal cual del template a `globals.css`, como en SPEC 01. No se reescribe con utilidades de Tailwind.
- **Sí:** el contador "CRÉDITOS · 03" y el botón "Iniciar Sesión" del nav no cambian.

---

## Riesgos identificados

| Riesgo | Mitigación |
| --- | --- |
| Quedan enlaces a `/` que debían ir a la Biblioteca | Paso 2 los lista; el paso 11 hace un `grep` final de `"/"` en `app/` y `components/`. |
| Reglas CSS duplicadas o en conflicto al copiar del template | Copiar solo los tres bloques indicados y revisar `.fade-in`, `.btn` y `.neon-*` antes de pegar. |
| `.reveal` deja el contenido invisible si JS no corre o el observer falla | El efecto se activa solo al montar; verificar que, sin hidratar, el contenido no queda oculto de forma permanente (o aplicar la clase de ocultación desde el cliente). |
| `100vh` del hero con el nav fijo desborda en móvil | Mantener `calc(100vh - 60px)` del template y revisarlo en ancho ≤ 768 px. |

---

## Qué **no** entra en este spec

- Pantalla "Acerca de" y formulario de contacto.
- Sesión de usuario, registro real o cualquier backend.
- Estadísticas o puntuaciones reales; todo en la Home es mock.
- Cambios de diseño respecto al template.
- Tests automatizados.
