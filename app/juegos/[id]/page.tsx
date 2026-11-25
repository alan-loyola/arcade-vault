import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GAMES } from "@/lib/games";
import { getTopScores } from "@/lib/scores";

const DETAIL_LIMIT = 10;

// Lee puntuaciones de la base de datos (dato de petición): va en <Suspense>.
async function Leaderboard({ gameId }: { gameId: string }) {
  const scores = await getTopScores(gameId, DETAIL_LIMIT);

  if (scores.length === 0) {
    return (
      <div
        className="pixel neon-yellow"
        style={{
          fontSize: 10,
          textAlign: "center",
          letterSpacing: "0.12em",
          lineHeight: 1.8,
          padding: "24px 8px",
        }}
      >
        AÚN NO HAY PUNTUACIONES · SÉ EL PRIMERO
      </div>
    );
  }

  return scores.map((r, i) => (
    <div
      key={r.rank}
      className={
        "lb-row" +
        (i === 0 ? " top1" : i === 1 ? " top2" : i === 2 ? " top3" : "")
      }
    >
      <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
      <div className="pl">
        {r.username}
        <div
          style={{
            fontSize: 10,
            color: "var(--ink-faint)",
            letterSpacing: "0.1em",
          }}
        >
          {r.date}
        </div>
      </div>
      <div className="sc">{r.score.toLocaleString("es-ES")}</div>
    </div>
  ));
}

export function generateStaticParams() {
  return GAMES.map((g) => ({ id: g.id }));
}

export default function GameDetailPage({ params }: PageProps<"/juegos/[id]">) {
  return (
    <Suspense fallback={null}>
      <GameDetail params={params} />
    </Suspense>
  );
}

// Lee params (dato de petición), así que va dentro de <Suspense>.
async function GameDetail({
  params,
}: {
  params: PageProps<"/juegos/[id]">["params"];
}) {
  const { id } = await params;
  const game = GAMES.find((g) => g.id === id);
  if (!game) notFound();

  return (
    <div className="av-detail fade-in">
      <div>
        <div className="detail-cover">
          <div className={"cover-bg " + game.cover}></div>
        </div>
        <div style={{ marginTop: 20 }} className="detail-info">
          <div className="detail-tags">
            <span>{game.cat}</span>
            <span>1 JUGADOR</span>
            <span>TECLADO / TÁCTIL</span>
            <span>RETRO 1985</span>
          </div>
          <h2 className="neon-cyan">{game.title}</h2>
          <p>{game.long}</p>
          <div className="stat-strip">
            <div>
              <div className="l">Partidas</div>
              <div className="v">{game.plays}</div>
            </div>
            <div>
              <div className="l">Mejor global</div>
              <div
                className="v"
                style={{
                  color: "var(--magenta)",
                  textShadow: "0 0 6px rgba(255,0,110,0.5)",
                }}
              >
                {game.best.toLocaleString("es-ES")}
              </div>
            </div>
            <div>
              <div className="l">Dificultad</div>
              <div
                className="v"
                style={{
                  color: "var(--yellow)",
                  textShadow: "0 0 6px rgba(245,255,0,0.5)",
                }}
              >
                ★ ★ ★ ☆ ☆
              </div>
            </div>
          </div>
          <div className="detail-actions">
            <Link href={`/juegos/${game.id}/jugar`} className="btn xl pulse">
              ▶ JUGAR AHORA
            </Link>
            <Link href="/juegos" className="btn ghost lg">
              VOLVER AL VAULT
            </Link>
          </div>
        </div>
      </div>

      <aside>
        <div className="leaderboard">
          <h3>MEJORES PUNTUACIONES</h3>
          <Suspense fallback={null}>
            <Leaderboard gameId={game.id} />
          </Suspense>
        </div>
      </aside>
    </div>
  );
}
