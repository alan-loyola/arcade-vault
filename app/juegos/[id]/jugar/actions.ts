"use server";
import { getGame } from "@/lib/games";
import { createClient } from "@/lib/supabase/server";
import type { SaveScoreResult } from "@/lib/scores";
const MAX_SCORE = 9_999_999;
const MAX_LEVEL = 999;
export async function saveScore(
  gameId: string,
  score: number,
  level: number,
): Promise<SaveScoreResult> {
  const validScore =
    Number.isInteger(score) && score >= 0 && score <= MAX_SCORE;
  const validLevel =
    Number.isInteger(level) && level >= 1 && level <= MAX_LEVEL;
  if (!validScore || !validLevel) return { ok: false, reason: "invalid" };
  // El juego debe existir en la BD (además de la FK de scores.game_id).
  const validGame =
    typeof gameId === "string" && (await getGame(gameId)) !== null;
  if (!validGame) return { ok: false, reason: "invalid" };
  const supabase = await createClient();
  // El user_id sale siempre de la sesión, nunca del cliente.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "unauthenticated" };
  const { error } = await supabase
    .from("scores")
    .insert({ user_id: user.id, game_id: gameId, score, level });
  if (error) {
    console.error("saveScore:", error);
    return { ok: false, reason: "send" };
  }
  return { ok: true };
}
