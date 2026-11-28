// Paletas de SERPENTINA por skin. Único archivo del juego con colores.
// CLÁSICO = colores originales exactos (SPEC 09).
import type { SkinSet } from "@/lib/skins";
import type { FruitKind, PixelColors } from "./constants";
export interface SerpentinaPalette {
  background: string; // fondo del canvas
  grid: string; // cuadrícula (decorativa)
  body: string; // cuerpo de la serpiente (y color de su glow)
  head: string; // cabeza
  eye: string; // ojos de la cabeza
  snakeGlow: number; // shadowBlur de la serpiente; 0 = sin glow
  fruitGlow: number; // shadowBlur de frutas y bonus; 0 = sin glow
  // Colores del pixel-art por clave de carácter (ver FRUIT_ART en fruits.ts)
  fruits: Record<FruitKind, PixelColors>;
  bonus: PixelColors; // estrella bonus: y (base), w (brillo), o (sombra)
}
export const SKINS: SkinSet<SerpentinaPalette> = {
  // Colores del original (SPEC 09)
  clasico: {
    background: "#05070a",
    grid: "#0f1a14",
    body: "#39ff6a",
    head: "#b6ffc8",
    eye: "#05070a",
    snakeGlow: 12,
    fruitGlow: 0,
    fruits: {
      apple: {
        r: "#ff3b4e",
        h: "#ffc2ca",
        d: "#a8102a",
        s: "#8b5a2b",
        l: "#39d353",
      },
      cherry: { r: "#ff1f4b", h: "#ffb3c4", d: "#9c0a2c", g: "#39d353" },
      grape: { p: "#a24bff", l: "#d7a8ff", d: "#5e1fa8", g: "#39d353" },
      lemon: { y: "#ffe94a", h: "#fffbd0", o: "#c9a600", g: "#39d353" },
    },
    bonus: { y: "#ffd700", w: "#fff5b0", o: "#c9a000" },
  },
  // Casi negro, serpiente cian y frutas en tonos eléctricos distintos entre sí
  // (magenta, rojo rosado, violeta, amarillo, naranja para el bonus); glow
  // moderado solo en serpiente y frutas
  neon: {
    background: "#04040a",
    grid: "#1a1a3a",
    body: "#00f5ff",
    head: "#b8fdff",
    eye: "#04040a",
    snakeGlow: 10,
    fruitGlow: 8,
    fruits: {
      apple: {
        r: "#ff2bd6",
        h: "#ffb8f0",
        d: "#a0157f",
        s: "#ff8a00",
        l: "#7dff1a",
      },
      cherry: { r: "#ff3860", h: "#ffc0cc", d: "#b0123a", g: "#7dff1a" },
      grape: { p: "#b14bff", l: "#e0b8ff", d: "#6a1fd0", g: "#7dff1a" },
      lemon: { y: "#f5ff00", h: "#fdffc0", o: "#b8c000", g: "#7dff1a" },
    },
    bonus: { y: "#ffb000", w: "#fff0c0", o: "#c07800" },
  },
  // Monitor de fósforo verde: 6 tonos de una sola familia, sin glow.
  // Serpiente en el tono brillante, frutas en el tono medio (se distinguen por
  // luminosidad, 1.94:1) y bonus en el más claro.
  retro: {
    background: "#010602",
    grid: "#0e2a17",
    body: "#33ff66",
    head: "#c8ffd6",
    eye: "#010602",
    snakeGlow: 0,
    fruitGlow: 0,
    fruits: {
      apple: {
        r: "#26b84d",
        h: "#c8ffd6",
        d: "#1a6b33",
        s: "#1a6b33",
        l: "#33ff66",
      },
      cherry: { r: "#26b84d", h: "#c8ffd6", d: "#1a6b33", g: "#33ff66" },
      grape: { p: "#26b84d", l: "#c8ffd6", d: "#1a6b33", g: "#33ff66" },
      lemon: { y: "#26b84d", h: "#c8ffd6", o: "#1a6b33", g: "#33ff66" },
    },
    bonus: { y: "#c8ffd6", w: "#33ff66", o: "#26b84d" },
  },
};
