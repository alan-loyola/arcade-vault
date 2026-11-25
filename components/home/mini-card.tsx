import Link from "next/link";
import { formatPlays, type GameWithStats } from "@/lib/game-types";
export function MiniCard({ game }: { game: GameWithStats }) {
  return (
    <Link href={`/juegos/${game.id}`} className="mini-card">
      <div className="mini-cover">
        <div className={"cover-bg " + game.cover}></div>
      </div>
      <div className="mini-meta">
        <div className="mini-title">{game.title}</div>
        <div className="mini-cat">{game.cat}</div>
        <div className="mini-cat">{formatPlays(game.plays)} PARTIDAS</div>
      </div>
    </Link>
  );
}
