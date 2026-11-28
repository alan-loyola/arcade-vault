# SPEC 10 — Controles táctiles: jugar los juegos reales en el móvil

> **Estado:** Aprobado
> **Depende de:** SPEC 05, SPEC 07, SPEC 08, SPEC 09
> **Fecha:** 2026-11-28
> **Objetivo:** Añadir un mando virtual en pantalla al reproductor `/juegos/[id]/jugar` para que los cuatro juegos reales se puedan jugar en dispositivos táctiles en vertical, sin cambiar sus motores.

---

## Por qué existe este spec

Los cuatro juegos reales (ASTEROIDES, CAÍDA, BLOQUE BUSTER y SERPENTINA) solo aceptan teclado: cada motor escucha `keydown`/`keyup` en `window` y lee `e.code`. BLOQUE BUSTER acepta además `mousemove` sobre el canvas. En un móvil no hay forma de jugar. Todos los specs de juego (05, 07, 08 y 09) dejaron "Controles táctiles / móvil" fuera de alcance; este spec lo resuelve para todos a la vez.

La solución no toca los motores. Un mando virtual dispara eventos `KeyboardEvent` sintéticos en `window` con los mismos `e.code` que ya escuchan los motores. Los motores ya ignoran las teclas en pausa, tras el fin y en campos de texto (`isListening()`, `isTextField(e.target)`), y un evento disparado en `window` tiene `target = window`, así que pasa esos filtros sin cambios.

---

## Alcance

**Dentro:**

- Tipo `TouchButton` y campo opcional `touch?: TouchButton[]` en `RealGame` (`components/games/registry.ts`), relleno para los 4 juegos reales con la distribución de la sección "Modelo de datos".
- Hook `components/games/use-coarse-pointer.ts`: `true` cuando la media query `(pointer: coarse)` coincide, `false` en el servidor y en la hidratación.
- Componente cliente `components/games/touch-controls.tsx` (`TouchControls`): pinta los botones en dos zonas (izquierda y derecha), traduce Pointer Events a `keydown`/`keyup` sintéticos en `window`, soporta multitáctil (varios botones a la vez) y repite `keydown` en los botones marcados `repeat`.
- Integración en `components/game-player.tsx`: el mando aparece bajo el marco CRT solo si el juego es real, tiene `touch` y el puntero es grueso. En ese caso se oculta el texto de ayuda de teclado (`.game-controls`).
- Mando desactivado con la partida no activa (`paused || over || hidden`): al desactivarse suelta todos los botones (envía `keyup`) y corta la repetición.
- Estilos en `app/globals.css`: mando (`.touch-pad`, `.touch-zone`, `.touch-btn`), estado pulsado y diseño vertical del reproductor con puntero grueso (HUD compacto, canvas a lo ancho y alto limitado para que el mando quepa sin scroll).
- Sin scroll, zoom por doble toque, menú contextual ni selección de texto al tocar el mando.
- Actualizar `integration.md` de la skill `/new-game` (copias en `.claude/skills/` y `.agents/skills/`) para que los juegos reales nuevos declaren `touch`.

**Fuera de alcance (para otros specs):**

- Gestos nativos por juego (deslizar en SERPENTINA, arrastrar la paleta en BLOQUE BUSTER, tocar para rotar en CAÍDA).
- Cambios en los motores (`lib/games/*/engine.ts`) o en el contrato `lib/game-engine.ts`.
- Orientación horizontal, bloqueo de orientación y pantalla completa.
- Vibración háptica (`navigator.vibrate`).
- Interruptor manual para mostrar u ocultar el mando.
- Adaptar a móvil el resto de rutas (home, `/juegos`, `/juegos/[id]`, `/salon`, `/acerca`, `/auth`).
- Controles para los juegos simulados (no tienen entrada).
- Mando físico (Gamepad API).
- Tests automatizados.

---

## Modelo de datos

No hay cambios en la base de datos ni en el contrato de los motores. Lo nuevo es la descripción del mando en el registro.

```ts
// components/games/registry.ts
export type TouchZone = "left" | "right";
export interface TouchButton {
  code: string; // e.code que se envía; debe estar en GAME_KEYS del motor
  label: string; // texto o símbolo visible ("←", "DISPARO")
  aria: string; // aria-label en español ("Girar a la izquierda")
  zone: TouchZone; // zona del mando: izquierda (pulgar izq.) o derecha
  repeat?: true; // reenvía keydown mientras se mantiene pulsado
}
export interface RealGame {
  // …campos existentes…
  // Mando virtual en dispositivos táctiles. Sin él, no se muestra mando.
  touch?: TouchButton[];
}
```

Distribución por juego (los `code` salen de los `GAME_KEYS` de cada motor):

| Juego           | Zona izquierda                                                                | Zona derecha                           |
| --------------- | ----------------------------------------------------------------------------- | -------------------------------------- |
| `asteroids`     | `←` `ArrowLeft`, `→` `ArrowRight`                                             | `IMPULSO` `ArrowUp`, `DISPARO` `Space` |
| `caida`         | `←` `ArrowLeft` (repeat), `→` `ArrowRight` (repeat), `↓` `ArrowDown` (repeat) | `ROTAR` `ArrowUp`, `CAER` `Space`      |
| `bloque-buster` | `←` `ArrowLeft`                                                               | `→` `ArrowRight`                       |
| `serpentina`    | cruceta `↑` `ArrowUp`, `←` `ArrowLeft`, `↓` `ArrowDown`, `→` `ArrowRight`     | (vacía)                                |

Convenciones:

- Constantes en `touch-controls.tsx`: `REPEAT_DELAY = 170` y `REPEAT_INTERVAL = 60` (ms), como el autorepeat típico del teclado.
- Evento enviado: `window.dispatchEvent(new KeyboardEvent(type, { code, key, bubbles: true, cancelable: true }))`, con `type` `"keydown"` o `"keyup"`. Los repetidos llevan `repeat: true`.
- Cada puntero activo se guarda en un `Map<pointerId, code>` en una ref. Un botón cuenta como pulsado mientras al menos un puntero lo mantiene. El primer puntero envía `keydown` y el último en soltar envía `keyup`.
- Se suelta un botón con `pointerup`, `pointercancel` y `lostpointercapture`. En `pointerdown` se llama a `setPointerCapture` para que deslizar el dedo fuera no deje la tecla pegada.
- Botón pulsado: atributo `data-pressed` para el estilo (no estado de React por puntero, para no re-renderizar en cada toque).
- `useCoarsePointer` usa `useSyncExternalStore` con `matchMedia("(pointer: coarse)")`. `getServerSnapshot` devuelve `false` para no causar desajustes de hidratación.
- Si un juego cambia sus teclas, su `touch` en el registro debe cambiar a la vez. No hay comprobación automática.

---

## Plan de implementación

Antes del paso 1: leer en `node_modules/next/dist/docs/` lo relativo a Client Components (ver CLAUDE.md), `components/game-player.tsx`, `components/games/game-canvas.tsx` y los `onKeyDown`/`onKeyUp` de los 4 motores. Para el diseño del mando y del reproductor en vertical usar `/frontend-design` (ver CLAUDE.md).

1. Añadir `TouchZone`, `TouchButton` y `touch?` a `components/games/registry.ts` y rellenar `touch` en los 4 juegos según la tabla. Verificación: `npx tsc --noEmit`; nada cambia en el navegador.
2. Crear `components/games/use-coarse-pointer.ts` con `useCoarsePointer()`. Verificación: tipos y `npx eslint components`.
3. Crear `components/games/touch-controls.tsx` con `TouchControls({ buttons, disabled })`: zonas izquierda/derecha, Pointer Events con captura, `Map` de punteros, repetición con `REPEAT_DELAY`/`REPEAT_INTERVAL`, soltar todo al pasar a `disabled` y al desmontar, `preventDefault` de `contextmenu`. Verificación: tipos y lint.
4. Integrar en `GamePlayer`: con `real?.touch` y `useCoarsePointer()`, renderizar `<TouchControls buttons={real.touch} disabled={paused || over || hidden} />` bajo el `.crt` y ocultar `.game-controls`. Verificación: en escritorio el reproductor se ve igual que antes; con emulación móvil aparece el mando.
5. Estilos en `app/globals.css`: `.touch-pad`, `.touch-zone`, `.touch-btn` (mínimo 56×56 px, `touch-action: none`, `user-select: none`, `-webkit-touch-callout: none`, `-webkit-tap-highlight-color: transparent`), `.touch-btn[data-pressed]`, cruceta de SERPENTINA y, bajo `@media (pointer: coarse)`, reproductor en vertical: HUD compacto y `.crt-screen--canvas` a lo ancho con alto limitado (`svh`) para que HUD, canvas y mando quepan sin scroll en 390×844. Verificación: capturas en Playwright con 390×844 para los 4 juegos.
6. Probar cada juego con emulación táctil en Playwright (contexto con `hasTouch` e `isMobile`, p. ej. el perfil de iPhone): ASTEROIDES gira, acelera y dispara a la vez; CAÍDA mueve con repetición, rota y deja caer; BLOQUE BUSTER mueve la paleta; SERPENTINA gira en las 4 direcciones. Verificación: consola sin errores.
7. Actualizar `integration.md` de `/new-game` en `.claude/skills/new-game/` y `.agents/skills/new-game/` (mismas líneas en ambas): los juegos reales nuevos declaran `touch` en `REAL_GAMES` con `code` presentes en su `GAME_KEYS`. Verificación: `diff` entre las dos copias sin diferencias.
8. Revisión final: `npx eslint app components lib`, `npm run build` y una partida de cada juego en emulación móvil con la consola abierta.

---

## Criterios de aceptación

- [ ] `npx eslint app components lib` y `npm run build` terminan sin errores.
- [ ] `git diff` no muestra cambios en `lib/games/` ni en `lib/game-engine.ts`.
- [ ] En escritorio (puntero fino) no aparece el mando y se ve el texto de controles de teclado de cada juego.
- [ ] Con puntero grueso, los 4 juegos reales muestran el mando con los botones de la tabla y no se ve el texto de controles de teclado.
- [ ] Los juegos simulados no muestran mando con ningún tipo de puntero.
- [ ] La consola no muestra errores ni avisos de hidratación en `/juegos/<id>/jugar` para los 4 juegos, ni en escritorio ni en emulación móvil.
- [ ] En 390×844 con puntero grueso, HUD, canvas completo y mando caben en la pantalla sin scroll vertical.
- [ ] Tocar y mantener `←` en ASTEROIDES gira la nave hasta soltar; mantener `IMPULSO` y tocar `DISPARO` a la vez acelera y dispara.
- [ ] Mantener `←` en CAÍDA mueve la pieza varias casillas; tocar una vez la mueve exactamente una.
- [ ] Mantener `→` en BLOQUE BUSTER mueve la paleta hasta soltar.
- [ ] Cada botón de la cruceta de SERPENTINA gira la serpiente en su dirección.
- [ ] Deslizar el dedo fuera de un botón pulsado y levantarlo suelta la tecla (la nave deja de girar, la paleta se para).
- [ ] Con PAUSA, tras el fin y con la pestaña oculta, tocar el mando no cambia el juego; al pausar con un botón pulsado, al reanudar la tecla no queda pegada.
- [ ] Tocar el mando no hace scroll, no hace zoom con doble toque, no abre menú contextual y no selecciona texto.
- [ ] Cada botón tiene `aria-label` en español.
- [ ] `JUGAR DE NUEVO` remonta el juego y el mando sigue funcionando.
- [ ] `.claude/skills/new-game/integration.md` y `.agents/skills/new-game/integration.md` son idénticos y mencionan el campo `touch`.

---

## Decisiones

- **Sí:** mando virtual común para todos los juegos. Un solo componente cubre los 4 juegos y los futuros con solo declarar `touch`.
- **No:** gestos por juego (deslizar, arrastrar, tocar). Más naturales, pero exigen diseñar e implementar cada uno; pueden llegar en otro spec.
- **No:** híbrido mando + gestos. Duplica caminos de entrada; se deja para cuando haya gestos.
- **Sí:** eventos `KeyboardEvent` sintéticos en `window`. Los motores no cambian y ya filtran pausa, fin y campos de texto.
- **No:** método `input(action, pressed)` en `GameEngine`. Más limpio, pero obliga a tocar el contrato y los 4 motores.
- **Sí:** mostrar el mando con `(pointer: coarse)`. Separa táctil de escritorio sin depender del ancho de la ventana.
- **No:** mostrar el mando por ancho de pantalla. Una ventana estrecha de escritorio no es táctil.
- **No:** interruptor manual del mando. La detección basta para este spec.
- **Sí:** solo vertical, sin bloqueo de orientación ni pantalla completa. Es el uso habitual del móvil y evita APIs con soporte desigual (`screen.orientation.lock`, Fullscreen en iOS).
- **Sí:** distribución del mando en el campo `touch` de `REAL_GAMES`. Vive junto a `controls`, que ya describe la entrada de cada juego.
- **No:** archivo `lib/games/<id>/touch.ts`. Más archivos para la misma información.
- **Sí:** repetición solo en botones con `repeat` (CAÍDA `←`, `→`, `↓`). ASTEROIDES, BLOQUE BUSTER y SERPENTINA leen la tecla mantenida o ignoran repeticiones.
- **No:** vibración háptica. No funciona en iOS Safari y no es necesaria para jugar.
- **Sí:** solo el reproductor. El resto de rutas ya tiene media queries; si hace falta revisarlas, otro spec.

---

## Riesgos

| Riesgo                                                                    | Mitigación                                                                                                      |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Un motor futuro comprueba `e.isTrusted` y descarta los eventos sintéticos | `integration.md` indica que los motores no deben filtrar por `isTrusted`.                                       |
| `touch` del registro desincronizado con `GAME_KEYS` del motor             | `integration.md` lo exige al añadir un juego; los criterios de aceptación prueban cada botón de los 4 juegos.   |
| Tecla pegada si el navegador no envía `pointerup` (p. ej. cambio de app)  | Soltar también en `pointercancel`, `lostpointercapture`, al pasar a `disabled` (pestaña oculta) y al desmontar. |
| La emulación de Playwright no reproduce un móvil real                     | Probar además en un dispositivo real con `npm run dev -- -H 0.0.0.0` en la red local, si está disponible.       |
| Alto de la barra del navegador móvil variable (`100vh` engañoso)          | Usar unidades `svh` para limitar el alto del canvas.                                                            |

---

## Qué **no** entra en este spec

- Gestos nativos por juego.
- Cambios en motores o en el contrato `GameEngine`.
- Orientación horizontal, pantalla completa y bloqueo de orientación.
- Vibración háptica e interruptor manual del mando.
- Adaptar a móvil el resto de rutas.
- Mando físico (Gamepad API).

Cada uno de esos, si llega, va en su propio spec.
