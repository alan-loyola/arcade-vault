import { Suspense } from "react";
import { HallOfFame } from "@/components/hall-of-fame";
import { GAMES } from "@/lib/games";
import { getTopScores, type ScoreEntry } from "@/lib/scores";
const HALL_LIMIT = 12;
// Lee puntuaciones de la base de datos (dato de petición): va en <Suspense>.
async function HallWithScores() {
  const entries = await Promise.all(
    GAMES.map(
      async (g) => [g.id, await getTopScores(g.id, HALL_LIMIT)] as const,
    ),
  );
  const scoresByGame: Record<string, ScoreEntry[]> =
    Object.fromEntries(entries);
  return <HallOfFame scoresByGame={scoresByGame} />;
}
export default function SalonPage() {
  return (
    <Suspense fallback={null}>
      <HallWithScores />
    </Suspense>
  );
}
