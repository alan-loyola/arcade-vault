"use client";
import { useState } from "react";
import Link from "next/link";
import type { Game } from "@/lib/game-types";
import type { ScoreEntry } from "@/lib/scores";
interface HallOfFameProps {
  games: Pick<Game, "id" | "title">[];
  scoresByGame: Record<string, ScoreEntry[]>;
}
export function HallOfFame({ games, scoresByGame }: HallOfFameProps) {
  const [tab, setTab] = useState(games[0]?.id ?? "");
  const rows = scoresByGame[tab] ?? [];
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
      {rows.length === 0 ? (
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
                {second ? second.score.toLocaleString("es-ES") : "—"}
              </div>
              <div className="date">{second?.date ?? ""}</div>
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
                {first.score.toLocaleString("es-ES")}
              </div>
              <div className="date">{first.date}</div>
            </div>
            <div className="podium-slot bronze">
              <div className="rank-num">03</div>
              <div className="name">{third?.username ?? "—"}</div>
              <div className="score">
                {third ? third.score.toLocaleString("es-ES") : "—"}
              </div>
              <div className="date">{third?.date ?? ""}</div>
            </div>
          </div>
          <div className="hall-table">
            <div className="th">
              <div>RANGO</div>
              <div>JUGADOR</div>
              <div>PUNTUACIÓN</div>
              <div>FECHA</div>
            </div>
            {rows.map((r, i) => (
              <div
                key={r.rank}
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
                <div className="sc">{r.score.toLocaleString("es-ES")}</div>
                <div className="dt">{r.date}</div>
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
