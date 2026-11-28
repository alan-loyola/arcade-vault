// Paletas de ASTEROIDES por skin. Único archivo del juego con colores.
// CLÁSICO = colores originales exactos (vectorial blanco sobre negro).
import type { SkinSet } from "@/lib/skins";
export interface AsteroidsPalette {
  background: string; // fondo del canvas
  ship: string; // contorno de la nave
  thrust: string; // llama del propulsor
  bullet: string; // balas
  asteroid: string; // contorno de los asteroides
  powerUp: string; // rombo y texto "3x" del power-up
  particle: string; // chispas de explosión (la partícula aplica su opacidad)
  glow: number; // shadowBlur de las entidades; 0 = sin glow
  lineWidth: number; // trazo de nave y asteroides
  powerUpLineWidth: number; // trazo del rombo del power-up
  particleLineWidth: number; // trazo de las chispas
}
export const SKINS: SkinSet<AsteroidsPalette> = {
  // Colores del original (references/started-games/02-asteroids)
  clasico: {
    background: "#000",
    ship: "#fff",
    thrust: "rgba(255, 130, 0, 0.85)",
    bullet: "#fff",
    asteroid: "#fff",
    powerUp: "#0ff",
    particle: "#fff",
    glow: 0,
    lineWidth: 1.5,
    powerUpLineWidth: 2,
    particleLineWidth: 1,
  },
  // Casi negro, tonos eléctricos y glow moderado solo en entidades
  neon: {
    background: "#04040a",
    ship: "#00f5ff",
    thrust: "#ff8a00",
    bullet: "#f5ff00",
    asteroid: "#ff2bd6",
    powerUp: "#7dff1a",
    particle: "#6a1a5e",
    glow: 10,
    lineWidth: 1.5,
    powerUpLineWidth: 2,
    particleLineWidth: 1,
  },
  // Monitor de fósforo ámbar: 5 tonos de una sola familia ordenados por
  // luminancia (bala > nave > power-up/llama > asteroide > chispas), sin glow
  // y con trazo más grueso
  retro: {
    background: "#060300",
    ship: "#ffe0a0",
    thrust: "#e89a00",
    bullet: "#fff1cc",
    asteroid: "#a86e00",
    powerUp: "#e89a00",
    particle: "#553800",
    glow: 0,
    lineWidth: 2,
    powerUpLineWidth: 2.5,
    particleLineWidth: 1.5,
  },
};
