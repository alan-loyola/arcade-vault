// Paletas de BLOQUE BUSTER por skin. Único archivo del juego con colores.
// CLÁSICO dibuja el spritesheet original tal cual (solo aporta el fondo);
// NEÓN y RETRO dibujan paleta, pelota, bloques y explosiones con primitivas
// de canvas usando su paleta (sin recolorear la imagen).
import type { SkinSet } from "@/lib/skins";
import type { BlockColor } from "./levels";
// CLÁSICO: los sprites ya llevan sus colores originales.
export interface BloqueBusterSpritePalette {
  kind: "sprite";
  background: string; // fondo del canvas
}
// NEÓN / RETRO: todo se dibuja con primitivas.
export interface BloqueBusterVectorPalette {
  kind: "vector";
  background: string; // fondo del canvas
  paddle: string; // cuerpo de la paleta
  paddleAccent: string; // remates de los extremos de la paleta
  ball: string; // pelota
  blocks: Record<BlockColor, string>; // un tono por tipo de bloque, sin repetir
  blockFillAlpha: number; // opacidad del relleno del bloque (1 = sólido)
  blockLineWidth: number; // trazo del contorno del bloque (0 = sin contorno)
  explosion: string; // fragmentos de la explosión (decorativos)
  ballShape: "circle" | "square";
  glow: number; // shadowBlur de las entidades; 0 = sin glow
}
export type BloqueBusterPalette =
  BloqueBusterSpritePalette | BloqueBusterVectorPalette;
export const SKINS: SkinSet<BloqueBusterPalette> = {
  // Original: fondo negro + spritesheet sin cambios. Tonos dominantes de los
  // sprites (para auditar): paleta y pelota #babac5; bloques gray #323142,
  // red #c02a3e, yellow #d9bd4c, cyan #4fc99c, magenta #632ff4,
  // hotpink #fc7d1c, green #44aaf3.
  clasico: {
    kind: "sprite",
    background: "#000",
  },
  // Casi negro, contornos eléctricos con glow moderado y relleno translúcido.
  // Se conservan los tonos visibles del original (los nombres de los tipos
  // no coinciden con su color: cyan es verde, green es azul, hotpink es naranja).
  neon: {
    kind: "vector",
    background: "#04040a",
    paddle: "#00f5ff",
    paddleAccent: "#ff2bd6",
    ball: "#f4fbff",
    blocks: {
      gray: "#c8c8d8",
      red: "#ff2b55",
      yellow: "#ffe600",
      cyan: "#00ff9c",
      magenta: "#9d5cff",
      hotpink: "#ff8a00",
      green: "#1fa2ff",
    },
    blockFillAlpha: 0.25,
    blockLineWidth: 2,
    explosion: "#3a1d4a",
    ballShape: "circle",
    glow: 10,
  },
  // Monitor de fósforo verde: bloques sólidos en una rampa de luminancia
  // (todos ≤ 0.4 para que la parrilla no deslumbre), pelota y paleta más
  // brillantes, sin glow y con bordes duros (pelota cuadrada).
  retro: {
    kind: "vector",
    background: "#010601",
    paddle: "#33ff66",
    paddleAccent: "#e0ffe6",
    ball: "#e0ffe6",
    blocks: {
      gray: "#1d923a",
      red: "#26bf4c",
      yellow: "#187930",
      cyan: "#22ab44",
      magenta: "#209e3f",
      hotpink: "#166c2b",
      green: "#1b8836",
    },
    blockFillAlpha: 1,
    blockLineWidth: 0,
    explosion: "#0e461c",
    ballShape: "square",
    glow: 0,
  },
};
