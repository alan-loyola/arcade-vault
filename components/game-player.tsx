"use client";
import { useEffect, useState, useTransition, type CSSProperties } from "react";
import Link from "next/link";
import { saveScore } from "@/app/juegos/[id]/jugar/actions";
import { GameCanvas } from "@/components/games/game-canvas";
import { REAL_GAMES } from "@/components/games/registry";
import { TouchControls } from "@/components/games/touch-controls";
import { useCoarsePointer } from "@/components/games/use-coarse-pointer";
import { useGameSkin } from "@/components/games/use-game-skin";
import { SKIN_IDS, SKIN_LABELS } from "@/lib/skins";
interface GamePlayerProps {
  gameId: string;
  title: string;
  username: string | null; // null = invitado (sin sesión)
}
export function GamePlayer({ gameId, title, username }: GamePlayerProps) {
  const real = REAL_GAMES[gameId] ?? null; // null = simulador
  const isReal = real !== null;
  const initialLives = real?.initialLives ?? 3;
  const [{ score, level }, setStats] = useState({ score: 0, level: 1 });
  const [lives, setLives] = useState(initialLives);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [saving, startSaving] = useTransition();
  const [runKey, setRunKey] = useState(0); // cambia al reiniciar: remonta el motor
  const [hidden, setHidden] = useState(false); // pestaña oculta
  const hasSkins = real?.skins === true; // selector solo en juegos con skins
  // DEFAULT_SKIN en el servidor y en la hidratación; luego el skin guardado
  // del juego. Cambiarlo no pausa, no reinicia y no toca runKey.
  const [skin, chooseSkin] = useGameSkin(gameId, hasSkins);
  // Mando virtual: solo juegos reales con `touch` y puntero grueso (false en
  // el servidor y en la hidratación, así que el primer render es el de escritorio).
  const coarsePointer = useCoarsePointer();
  const touchButtons = coarsePointer ? (real?.touch ?? null) : null;
  const name = username ?? "INVITADO";
  // Pausa el motor real al ocultar la pestaña y lo reanuda al volver.
  useEffect(() => {
    if (!isReal) return;
    const onVisibility = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [isReal]);
  // El puntaje inicia en 0 y solo sube tras montar (evita desajustes de hidratación).
  useEffect(() => {
    if (isReal || over || paused) return;
    const t = setInterval(() => {
      const inc = Math.floor(10 + Math.random() * 90);
      setStats(({ score: s, level: l }) => {
        const next = s + inc;
        // Sube de nivel al cruzar cada múltiplo de ~2500 puntos.
        return { score: next, level: next % 2500 < 100 ? l + 1 : l };
      });
    }, 220);
    return () => clearInterval(t);
  }, [isReal, over, paused]);
  const endGame = () => setOver(true);
  const handleGameOver = (result: { score: number; level: number }) => {
    setStats(result);
    setOver(true);
  };
  const restart = () => {
    setRunKey((k) => k + 1);
    setStats({ score: 0, level: 1 });
    setLives(initialLives);
    setPaused(false);
    setOver(false);
    setSaved(false);
    setSaveError(false);
  };
  const handleSave = () => {
    setSaveError(false);
    startSaving(async () => {
      const result = await saveScore(gameId, score, level);
      if (result.ok) setSaved(true);
      else setSaveError(true);
    });
  };
  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              {name}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{score.toLocaleString("es-ES")}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v">{"♥ ".repeat(lives).trim() || "—"}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(level).padStart(2, "0")}</div>
          </div>
        </div>
        <div
          className={
            hasSkins ? "hud-actions hud-actions--skins" : "hud-actions"
          }
        >
          {hasSkins && (
            <div
              className="skin-switch"
              role="group"
              aria-label="Skin del juego"
            >
              <span className="skin-switch-label" aria-hidden="true">
                SKIN
              </span>
              {SKIN_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  className="skin-opt"
                  data-skin={id}
                  aria-pressed={skin === id}
                  onClick={() => chooseSkin(id)}
                >
                  <span className="skin-swatch" aria-hidden="true" />
                  {SKIN_LABELS[id]}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            className="btn yellow"
            onClick={() => setPaused((p) => !p)}
          >
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button type="button" className="btn magenta" onClick={endGame}>
            FIN
          </button>
          <Link href={`/juegos/${gameId}`} className="btn ghost">
            SALIR
          </Link>
        </div>
      </div>
      <div className="crt">
        <div
          className={real ? "crt-screen crt-screen--canvas" : "crt-screen"}
          style={
            real
              ? ({
                  "--game-w": real.width,
                  "--game-h": real.height,
                } as CSSProperties)
              : undefined
          }
        >
          {real ? (
            <GameCanvas
              key={runKey}
              createEngine={real.createEngine}
              width={real.width}
              height={real.height}
              label={real.label}
              paused={paused || over || hidden}
              skin={skin}
              onStats={(stats) => {
                setStats({ score: stats.score, level: stats.level });
                setLives(stats.lives);
              }}
              onGameOver={handleGameOver}
            />
          ) : (
            <div className="game-arena">
              <div className="grid-floor"></div>
              <div className="enemy e1"></div>
              <div className="enemy e2"></div>
              <div className="enemy e3"></div>
              <div className="player-ship"></div>
            </div>
          )}
          {paused && (
            <div
              className="crt-content"
              style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}
            >
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                  EN PAUSA
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-dim)",
                    marginTop: 10,
                    letterSpacing: "0.16em",
                  }}
                >
                  PULSA REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>
      {touchButtons ? (
        <TouchControls
          buttons={touchButtons}
          disabled={paused || over || hidden}
        />
      ) : (
        real && <p className="game-controls">{real.controls}</p>
      )}
      {over && (
        <div className="modal-bd">
          <div className="modal">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{score.toLocaleString("es-ES")}</div>
            {saved ? (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            ) : username ? (
              <>
                <div className="input-row">
                  <input value={name} readOnly aria-label="Jugador" />
                  <button
                    type="button"
                    className="btn yellow"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? "GUARDANDO…" : "GUARDAR PUNTUACIÓN"}
                  </button>
                </div>
                {saveError && (
                  <div
                    role="alert"
                    className="mono neon-magenta"
                    style={{
                      fontSize: 11,
                      letterSpacing: "0.1em",
                      marginTop: 8,
                    }}
                  >
                    NO SE PUDO GUARDAR · INTÉNTALO DE NUEVO
                  </div>
                )}
              </>
            ) : (
              <Link href="/auth" className="btn yellow">
                INICIA SESIÓN PARA GUARDAR
              </Link>
            )}
            <div className="actions">
              <button type="button" className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <Link href="/juegos" className="btn magenta">
                VOLVER AL VAULT
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
