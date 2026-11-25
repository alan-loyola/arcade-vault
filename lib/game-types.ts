// Tipos y constantes del catálogo, seguros para importar desde Client Components.
// La lectura de la BD vive en lib/games.ts (solo servidor).
export type Category = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type AccentColor = "cyan" | "magenta" | "yellow" | "green";
export interface Game {
  id: string; // slug de la URL, ej. "bloque-buster"
  title: string;
  short: string; // descripción corta para la card
  long: string; // descripción larga para el detalle
  cat: Category;
  cover: string; // clase CSS de globals.css, ej. "cover-bricks"
  color: AccentColor;
}
export interface GameWithStats extends Game {
  best: number; // max(score), 0 si no hay partidas
  plays: number; // count(scores), 0 si no hay partidas
}
export const CATS: ["TODOS", ...Category[]] = [
  "TODOS",
  "ARCADE",
  "PUZZLE",
  "SHOOTER",
  "VERSUS",
];
