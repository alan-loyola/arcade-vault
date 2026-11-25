import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
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
// Mejores `limit` filas del juego: score desc, y a igual score gana la más
// antigua. Lee datos de petición: llamar dentro de <Suspense>.
export async function getTopScores(
  gameId: string,
  limit: number,
): Promise<ScoreEntry[]> {
  await connection();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scores")
    .select("score, created_at, profiles(username)")
    .eq("game_id", gameId)
    .order("score", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) {
    console.error("getTopScores:", error);
    return [];
  }
  return data.map((row, i) => ({
    rank: i + 1,
    username: row.profiles?.username ?? "???",
    score: row.score,
    date: new Date(row.created_at).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }),
  }));
}
