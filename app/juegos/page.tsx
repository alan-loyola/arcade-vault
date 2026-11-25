import { Suspense } from "react";
import { Library } from "@/components/library";
import { getGamesWithStats } from "@/lib/games";
// Lee el catálogo y sus estadísticas de la BD (dato de petición).
async function LibraryWithGames() {
  const games = await getGamesWithStats();
  return <Library games={games} />;
}
export default function LibraryPage() {
  return (
    <Suspense fallback={null}>
      <LibraryWithGames />
    </Suspense>
  );
}
