"use client";
import { useCallback, useSyncExternalStore } from "react";
import {
  DEFAULT_SKIN,
  isSkinId,
  skinStorageKey,
  type SkinId,
} from "@/lib/skins";
// Skin elegido por juego, persistido en localStorage
// ("arcade-vault:skin:<gameId>"). En el servidor y durante la hidratación vale
// DEFAULT_SKIN (snapshot del servidor), así que no hay desajuste de hidratación;
// tras montar, React vuelve a renderizar con el valor guardado.
const listeners = new Set<() => void>();
// Respaldo en memoria si el navegador bloquea localStorage.
const memory = new Map<string, SkinId>();
function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange); // cambios desde otra pestaña
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}
function readSkin(gameId: string): SkinId {
  try {
    const stored = window.localStorage.getItem(skinStorageKey(gameId));
    if (isSkinId(stored)) return stored;
  } catch {
    // almacenamiento bloqueado: se usa el respaldo en memoria
  }
  return memory.get(gameId) ?? DEFAULT_SKIN;
}
const serverSkin = (): SkinId => DEFAULT_SKIN;
// `enabled = false` (juego sin skins): siempre DEFAULT_SKIN y no persiste nada.
export function useGameSkin(
  gameId: string,
  enabled: boolean,
): [SkinId, (skin: SkinId) => void] {
  const getSnapshot = useCallback(
    () => (enabled ? readSkin(gameId) : DEFAULT_SKIN),
    [gameId, enabled],
  );
  const skin = useSyncExternalStore(subscribe, getSnapshot, serverSkin);
  const setSkin = useCallback(
    (next: SkinId) => {
      if (!enabled || !isSkinId(next)) return;
      memory.set(gameId, next);
      try {
        window.localStorage.setItem(skinStorageKey(gameId), next);
      } catch {
        // sin persistencia: el skin se aplica solo en esta visita
      }
      listeners.forEach((l) => l());
    },
    [gameId, enabled],
  );
  return [skin, setSkin];
}
