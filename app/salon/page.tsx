import { Suspense } from "react";
import { HallOfFame } from "@/components/hall-of-fame";
import { getGames } from "@/lib/games";
import { getTopScores, type ScoreEntry } from "@/lib/scores";
const HALL_LIMIT = 12;
// Lee el catálogo y las puntuaciones de la base de datos (dato de petición):
// va en <Suspense>.
async function HallWithScores() {
  const games = await getGames();
  const entries = await Promise.all(
    games.map(
      async (g) => [g.id, await getTopScores(g.id, HALL_LIMIT)] as const,
    ),
  );
  const scoresByGame: Record<string, ScoreEntry[]> =
    Object.fromEntries(entries);
  return (
    <HallOfFame
      games={games.map((g) => ({ id: g.id, title: g.title }))}
      scoresByGame={scoresByGame}
    />
  );
}
export default function SalonPage() {
  return (
    <Suspense fallback={null}>
      <HallWithScores />
    </Suspense>
  );
}
