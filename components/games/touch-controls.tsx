"use client";
// Mando virtual para dispositivos táctiles. Traduce Pointer Events a
// KeyboardEvent sintéticos en window con los mismos e.code que escuchan los
// motores, así que los motores no cambian (ya filtran pausa, fin y campos de
// texto). Soporta varios dedos a la vez y repite keydown en botones `repeat`.
import { useCallback, useEffect, useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { TouchButton, TouchZone } from "./registry";
// Autorepeat típico del teclado (ms)
const REPEAT_DELAY = 170;
const REPEAT_INTERVAL = 60;
const DPAD_CODES = ["ArrowUp", "ArrowLeft", "ArrowDown", "ArrowRight"];
const ZONES: { zone: TouchZone; label: string }[] = [
  { zone: "left", label: "Controles izquierdos" },
  { zone: "right", label: "Controles derechos" },
];
interface TouchControlsProps {
  buttons: TouchButton[];
  // Partida no activa (pausa, fin, pestaña oculta): no se envían teclas y se
  // sueltan las pulsadas.
  disabled: boolean;
}
interface RepeatTimers {
  delay: ReturnType<typeof setTimeout>;
  interval?: ReturnType<typeof setInterval>;
}
// e.key aproximado para el e.code enviado (los motores solo leen e.code)
function keyFor(code: string): string {
  if (code === "Space") return " ";
  if (code.startsWith("Key")) return code.slice(3).toLowerCase();
  return code;
}
function dispatchKey(type: "keydown" | "keyup", code: string, repeat = false) {
  window.dispatchEvent(
    new KeyboardEvent(type, {
      code,
      key: keyFor(code),
      repeat,
      bubbles: true,
      cancelable: true,
    }),
  );
}
// Una zona con exactamente las 4 flechas se pinta como cruceta
function isDpad(buttons: TouchButton[]): boolean {
  return (
    buttons.length === DPAD_CODES.length &&
    DPAD_CODES.every((code) => buttons.some((b) => b.code === code))
  );
}
export function TouchControls({ buttons, disabled }: TouchControlsProps) {
  const padRef = useRef<HTMLDivElement>(null);
  // pointerId → code del botón que mantiene ese puntero
  const pointersRef = useRef(new Map<number, string>());
  const timersRef = useRef(new Map<string, RepeatTimers>());
  const setPressed = useCallback((code: string, pressed: boolean) => {
    const el = padRef.current?.querySelector(`[data-code="${code}"]`);
    if (!el) return;
    if (pressed) el.setAttribute("data-pressed", "");
    else el.removeAttribute("data-pressed");
  }, []);
  const stopRepeat = useCallback((code: string) => {
    const timers = timersRef.current.get(code);
    if (!timers) return;
    clearTimeout(timers.delay);
    if (timers.interval) clearInterval(timers.interval);
    timersRef.current.delete(code);
  }, []);
  const startRepeat = useCallback((code: string) => {
    const timers: RepeatTimers = {
      delay: setTimeout(() => {
        timers.interval = setInterval(
          () => dispatchKey("keydown", code, true),
          REPEAT_INTERVAL,
        );
      }, REPEAT_DELAY),
    };
    timersRef.current.set(code, timers);
  }, []);
  const isHeld = useCallback((code: string) => {
    for (const held of pointersRef.current.values()) {
      if (held === code) return true;
    }
    return false;
  }, []);
  // Suelta el botón de un puntero; el último puntero en soltarlo envía keyup
  const release = useCallback(
    (pointerId: number) => {
      const code = pointersRef.current.get(pointerId);
      if (code === undefined) return;
      pointersRef.current.delete(pointerId);
      if (isHeld(code)) return;
      stopRepeat(code);
      setPressed(code, false);
      dispatchKey("keyup", code);
    },
    [isHeld, setPressed, stopRepeat],
  );
  const releaseAll = useCallback(() => {
    const codes = new Set(pointersRef.current.values());
    pointersRef.current.clear();
    for (const code of codes) {
      stopRepeat(code);
      setPressed(code, false);
      dispatchKey("keyup", code);
    }
  }, [setPressed, stopRepeat]);
  // Al desactivarse (pausa, fin, pestaña oculta) no queda ninguna tecla pegada
  useEffect(() => {
    if (disabled) releaseAll();
  }, [disabled, releaseAll]);
  useEffect(() => releaseAll, [releaseAll]);
  function handlePointerDown(
    e: ReactPointerEvent<HTMLButtonElement>,
    button: TouchButton,
  ) {
    e.preventDefault();
    if (disabled) return;
    // Captura: deslizar el dedo fuera del botón no deja la tecla pegada
    e.currentTarget.setPointerCapture(e.pointerId);
    const wasHeld = isHeld(button.code);
    pointersRef.current.set(e.pointerId, button.code);
    if (wasHeld) return;
    setPressed(button.code, true);
    dispatchKey("keydown", button.code);
    if (button.repeat) startRepeat(button.code);
  }
  function handlePointerEnd(e: ReactPointerEvent<HTMLButtonElement>) {
    release(e.pointerId);
  }
  return (
    <div
      ref={padRef}
      className="touch-pad"
      data-disabled={disabled ? "" : undefined}
      onContextMenu={(e) => e.preventDefault()}
    >
      {ZONES.map(({ zone, label }) => {
        const zoneButtons = buttons.filter((b) => b.zone === zone);
        const dpad = isDpad(zoneButtons);
        return (
          <div
            key={zone}
            role="group"
            aria-label={label}
            className={`touch-zone touch-zone--${zone}${dpad ? " touch-zone--dpad" : ""}`}
          >
            {zoneButtons.map((button) => (
              <button
                key={button.code}
                type="button"
                className="touch-btn"
                data-code={button.code}
                // glifo (flecha, dirección) o palabra (acción): estilo distinto
                data-kind={button.label.length === 1 ? "glyph" : "word"}
                aria-label={button.aria}
                aria-disabled={disabled}
                onPointerDown={(e) => handlePointerDown(e, button)}
                onPointerUp={handlePointerEnd}
                onPointerCancel={handlePointerEnd}
                onLostPointerCapture={handlePointerEnd}
              >
                {button.label}
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );
}
