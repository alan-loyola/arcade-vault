"use client";
// true cuando el puntero principal es grueso (táctil). En el servidor y en la
// hidratación devuelve false para no causar desajustes; tras hidratar,
// useSyncExternalStore lee matchMedia y se suscribe a sus cambios.
import { useSyncExternalStore } from "react";
const QUERY = "(pointer: coarse)";
function subscribe(onChange: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}
function getSnapshot() {
  return window.matchMedia(QUERY).matches;
}
function getServerSnapshot() {
  return false;
}
export function useCoarsePointer(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
