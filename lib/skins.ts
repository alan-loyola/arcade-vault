// Skins de los juegos reales (CLÁSICO, NEÓN, RETRO).
// Sin "use client": lo importan tanto los motores (lib/games/<id>/) como los
// componentes. Cada juego con skins define su paleta en lib/games/<id>/skins.ts
// como `SKINS: SkinSet<<Id>Palette>` y se marca con `skins: true` en REAL_GAMES.
export type SkinId = "clasico" | "neon" | "retro";
// Orden de los botones del selector.
export const SKIN_IDS: readonly SkinId[] = ["clasico", "neon", "retro"];
// CLÁSICO = colores originales del juego. Es el valor por defecto.
export const DEFAULT_SKIN: SkinId = "clasico";
export const SKIN_LABELS: Record<SkinId, string> = {
  clasico: "CLÁSICO",
  neon: "NEÓN",
  retro: "RETRO",
};
// Paletas de un juego indexadas por skin (las 3 claves son obligatorias).
export type SkinSet<P> = Record<SkinId, P>;
export function isSkinId(value: unknown): value is SkinId {
  return (
    typeof value === "string" && (SKIN_IDS as readonly string[]).includes(value)
  );
}
// Paleta inicial de un motor: la del skin pedido o la de DEFAULT_SKIN.
export function resolveSkin<P>(skins: SkinSet<P>, skin?: SkinId | null): P {
  return skins[isSkinId(skin) ? skin : DEFAULT_SKIN];
}
// Clave de localStorage donde GamePlayer guarda el skin elegido por juego.
export function skinStorageKey(gameId: string): string {
  return `arcade-vault:skin:${gameId}`;
}
// ── Contraste WCAG (para auditar las paletas en modo oscuro) ─────────────────
function parseHex(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) throw new Error(`Color hex no válido: ${hex}`);
  const h =
    m[1].length === 3
      ? m[1]
          .split("")
          .map((c) => c + c)
          .join("")
      : m[1];
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [
    number,
    number,
    number,
  ];
}
// Luminancia relativa WCAG 2.x de un color `#rgb` o `#rrggbb` (0 = negro, 1 = blanco).
export function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
// Contraste WCAG entre dos colores hex (de 1 a 21).
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
