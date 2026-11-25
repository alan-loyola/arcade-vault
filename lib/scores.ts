export interface ScoreEntry {
  rank: number;
  username: string;
  score: number;
  date: string; // "dd/mm/aaaa" (es-ES)
}
export type AuthState =
  { status: "idle" } | { status: "error"; message: string };
export type SaveScoreResult =
  { ok: true } | { ok: false; reason: "unauthenticated" | "invalid" | "send" };
