// Frutas de SERPENTINA: pixel-art original de 8×8 dibujado en código (SPEC 09).
// No usa references/source-assets/snake-assets/ (arte de un juego comercial).
import { CELL, type FruitKind, type PixelArt } from "./constants";
/** Lado del arte en píxeles lógicos. */
export const ART_SIZE = 8;
/** Escala de cada píxel lógico: 8 × 3 = 24 px, una celda. */
export const ART_SCALE = CELL / ART_SIZE;
/** Carácter transparente: no se pinta. */
export const TRANSPARENT = ".";
export const FRUIT_ART: Record<FruitKind, PixelArt> = {
  apple: {
    palette: {
      r: "#ff3b4e",
      h: "#ffc2ca",
      d: "#a8102a",
      s: "#8b5a2b",
      l: "#39d353",
    },
    rows: [
      "...sl...",
      "...sll..",
      ".rrsrrr.",
      "rhhrrrrr",
      "rhrrrrrr",
      "rrrrrrrd",
      ".rrrrrd.",
      "..rrdd..",
    ],
  },
  cherry: {
    palette: { r: "#ff1f4b", h: "#ffb3c4", d: "#9c0a2c", g: "#39d353" },
    rows: [
      "....gg..",
      "....g...",
      "...g.g..",
      "..g...g.",
      ".rr..rr.",
      "rhrrrhrr",
      "rrrdrrrd",
      ".dd..dd.",
    ],
  },
  grape: {
    palette: { p: "#a24bff", l: "#d7a8ff", d: "#5e1fa8", g: "#39d353" },
    rows: [
      "....g...",
      "...ggg..",
      ".lpplpp.",
      ".ppdppd.",
      "..lpplp.",
      "..ppdpd.",
      "...lpp..",
      "....d...",
    ],
  },
  lemon: {
    palette: { y: "#ffe94a", h: "#fffbd0", o: "#c9a600", g: "#39d353" },
    rows: [
      "......g.",
      "..yyyyg.",
      ".yhhyyy.",
      "yhyyyyyy",
      "yyyyyyyy",
      "yyyyyyyo",
      ".yyyyyo.",
      "..oooo..",
    ],
  },
};
/** Estrella dorada del bonus. */
export const BONUS_ART: PixelArt = {
  palette: { y: "#ffd700", w: "#fff5b0", o: "#c9a000" },
  rows: [
    "...yy...",
    "...yy...",
    "yyywyyyy",
    ".ywyyyy.",
    "..yyyy..",
    ".yyooyy.",
    ".yo..oy.",
    "o......o",
  ],
};
/** Pinta `art` ocupando la celda (cellX, cellY) del tablero. */
export function drawFruit(
  ctx: CanvasRenderingContext2D,
  art: PixelArt,
  cellX: number,
  cellY: number,
): void {
  const ox = cellX * CELL;
  const oy = cellY * CELL;
  for (let y = 0; y < art.rows.length; y++) {
    const row = art.rows[y];
    for (let x = 0; x < row.length; x++) {
      const key = row[x];
      if (key === TRANSPARENT) continue;
      const color = art.palette[key];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(
        ox + x * ART_SCALE,
        oy + y * ART_SCALE,
        ART_SCALE,
        ART_SCALE,
      );
    }
  }
}
