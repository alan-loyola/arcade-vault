import { Suspense } from "react";
import { notFound } from "next/navigation";
import { GAMES } from "@/lib/games";
import { GamePlayer } from "@/components/game-player";
import { getCurrentUser } from "@/lib/auth";
export function generateStaticParams() {
  return GAMES.map((g) => ({ id: g.id }));
}
// Lee params y la sesión (datos de petición), así que va dentro de <Suspense>.
async function Player({
  params,
}: {
  params: PageProps<"/juegos/[id]/jugar">["params"];
}) {
  const { id } = await params;
  const game = GAMES.find((g) => g.id === id);
  if (!game) notFound();
  const user = await getCurrentUser();
  return (
    <GamePlayer
      gameId={game.id}
      title={game.title}
      username={user?.username ?? null}
    />
  );
}
export default function PlayPage({ params }: PageProps<"/juegos/[id]/jugar">) {
  return (
    <Suspense fallback={null}>
      <Player params={params} />
    </Suspense>
  );
}
