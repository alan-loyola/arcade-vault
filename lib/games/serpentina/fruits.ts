// Frutas de SERPENTINA: pixel-art original de 8×8 dibujado en código (SPEC 09).
// No usa references/source-assets/snake-assets/ (arte de un juego comercial).
// Aquí solo está la forma; los colores de cada carácter salen de la paleta del
// skin (skins.ts).
import {
  CELL,
  type FruitKind,
  type PixelArt,
  type PixelColors,
} from "./constants";
/** Lado del arte en píxeles lógicos. */
export const ART_SIZE = 8;
/** Escala de cada píxel lógico: 8 × 3 = 24 px, una celda. */
export const ART_SCALE = CELL / ART_SIZE;
/** Carácter transparente: no se pinta. */
export const TRANSPARENT = ".";
export const FRUIT_ART: Record<FruitKind, PixelArt> = {
  apple: {
    main: "r",
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
    main: "r",
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
    main: "p",
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
    main: "y",
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
  main: "y",
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
function paintPixels(
  ctx: CanvasRenderingContext2D,
  art: PixelArt,
  colors: PixelColors,
  ox: number,
  oy: number,
): void {
  for (let y = 0; y < art.rows.length; y++) {
    const row = art.rows[y];
    for (let x = 0; x < row.length; x++) {
      const key = row[x];
      if (key === TRANSPARENT) continue;
      const color = colors[key];
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
/**
 * Pinta `art` con `colors` ocupando la celda (cellX, cellY) del tablero.
 * Con `glow` > 0 hace una pasada con sombra del color base y otra encima sin
 * sombra, para que el halo no tiña el interior del dibujo; deja shadowBlur a 0.
 */
export function drawFruit(
  ctx: CanvasRenderingContext2D,
  art: PixelArt,
  colors: PixelColors,
  cellX: number,
  cellY: number,
  glow = 0,
): void {
  const ox = cellX * CELL;
  const oy = cellY * CELL;
  const glowColor = colors[art.main];
  if (glow > 0 && glowColor) {
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = glow;
    paintPixels(ctx, art, colors, ox, oy);
  }
  ctx.shadowBlur = 0;
  paintPixels(ctx, art, colors, ox, oy);
}
