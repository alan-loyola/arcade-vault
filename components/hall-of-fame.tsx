"use client";
import { useState } from "react";
import Link from "next/link";
import type { Game } from "@/lib/game-types";
import type { GlobalRankEntry, ScoreEntry } from "@/lib/scores";
// Id de la pestaña global. Los ids de juego solo admiten [a-z0-9-], así que
// el guion bajo garantiza que nunca choca con uno.
const GLOBAL_TAB = "__global";
interface HallOfFameProps {
  games: Pick<Game, "id" | "title">[];
  scoresByGame: Record<string, ScoreEntry[]>;
  globalRanking: GlobalRankEntry[];
}
// Forma común de una fila del podio y de la tabla, venga de un juego o del
// ranking global.
interface HallRow {
  rank: number;
  username: string;
  value: number; // puntuación (juego) o total (global)
  extra: string; // fecha (juego) o juegos jugados (global)
}
function gamesLabel(n: number) {
  return `${n} ${n === 1 ? "JUEGO" : "JUEGOS"}`;
}
export function HallOfFame({
  games,
  scoresByGame,
  globalRanking,
}: HallOfFameProps) {
  const [tab, setTab] = useState(GLOBAL_TAB);
  const isGlobal = tab === GLOBAL_TAB;
  const rows: HallRow[] = isGlobal
    ? globalRanking.map((r) => ({
        rank: r.rank,
        username: r.username,
        value: r.total,
        extra: String(r.gamesPlayed),
      }))
    : (scoresByGame[tab] ?? []).map((r) => ({
        rank: r.rank,
        username: r.username,
        value: r.score,
        extra: r.date,
      }));
  // En el podio, "extra" del global se muestra con texto ("3 JUEGOS").
  const podiumExtra = (r?: HallRow) =>
    r ? (isGlobal ? gamesLabel(Number(r.extra)) : r.extra) : "";
  const [first, second, third] = rows;
  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>
      <div className="hall-tabs">
        <button
          type="button"
          className={"chip" + (isGlobal ? " active" : "")}
          onClick={() => setTab(GLOBAL_TAB)}
        >
          GLOBAL
        </button>
        {games.map((g) => (
          <button
            key={g.id}
            type="button"
            className={"chip" + (tab === g.id ? " active" : "")}
            onClick={() => setTab(g.id)}
          >
            {g.title}
          </button>
        ))}
      </div>
      {isGlobal && (
        <p
          className="pixel"
          style={{
            fontSize: 9,
            textAlign: "center",
            letterSpacing: "0.12em",
            lineHeight: 1.8,
            color: "var(--ink-faint)",
            margin: "0 0 24px",
          }}
        >
          SUMA DE LA MEJOR PUNTUACIÓN DE CADA JUGADOR EN CADA JUEGO
        </p>
      )}
      {!first ? (
        <div
          className="pixel neon-yellow"
          style={{
            fontSize: 12,
            textAlign: "center",
            letterSpacing: "0.12em",
            lineHeight: 1.8,
            padding: "48px 16px",
          }}
        >
          AÚN NO HAY PUNTUACIONES · SÉ EL PRIMERO
        </div>
      ) : (
        <>
          <div className="podium">
            <div className="podium-slot silver">
              <div className="rank-num">02</div>
              <div className="name">{second?.username ?? "—"}</div>
              <div className="score">
                {second ? second.value.toLocaleString("es-ES") : "—"}
              </div>
              <div className="date">{podiumExtra(second)}</div>
            </div>
            <div className="podium-slot gold">
              <div
                className="pixel"
                style={{
                  fontSize: 9,
                  color: "var(--gold)",
                  letterSpacing: "0.18em",
                }}
              >
                CAMPEÓN
              </div>
              <div className="rank-num" style={{ fontSize: 36, marginTop: 4 }}>
                01
              </div>
              <div className="name">{first.username}</div>
              <div className="score" style={{ fontSize: 20 }}>
                {first.value.toLocaleString("es-ES")}
              </div>
              <div className="date">{podiumExtra(first)}</div>
            </div>
            <div className="podium-slot bronze">
              <div className="rank-num">03</div>
              <div className="name">{third?.username ?? "—"}</div>
              <div className="score">
                {third ? third.value.toLocaleString("es-ES") : "—"}
              </div>
              <div className="date">{podiumExtra(third)}</div>
            </div>
          </div>
          <div className="hall-table">
            <div className="th">
              <div>RANGO</div>
              <div>JUGADOR</div>
              <div>{isGlobal ? "PUNTOS" : "PUNTUACIÓN"}</div>
              <div>{isGlobal ? "JUEGOS" : "FECHA"}</div>
            </div>
            {rows.map((r, i) => (
              <div
                key={`${tab}-${r.rank}`}
                className={
                  "tr" +
                  (i === 0
                    ? " top1"
                    : i === 1
                      ? " top2"
                      : i === 2
                        ? " top3"
                        : "")
                }
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
                <div className="pl">{r.username}</div>
                <div className="sc">{r.value.toLocaleString("es-ES")}</div>
                <div className="dt">{r.extra}</div>
              </div>
            ))}
          </div>
        </>
      )}
      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Link href="/juegos" className="btn lg">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  );
}
