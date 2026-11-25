"use client";
import { useEffect, useRef } from "react";
import {
  createAsteroidsEngine,
  type AsteroidsCallbacks,
  type AsteroidsEngine,
} from "@/lib/games/asteroids/engine";
import { H, W } from "@/lib/games/asteroids/constants";
interface AsteroidsCanvasProps {
  paused: boolean;
  onStats: AsteroidsCallbacks["onStats"];
  onGameOver: AsteroidsCallbacks["onGameOver"];
}
export function AsteroidsCanvas({
  paused,
  onStats,
  onGameOver,
}: AsteroidsCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<AsteroidsEngine | null>(null);
  // Los callbacks se guardan en refs para que el motor no se recree si el
  // padre pasa funciones nuevas en cada render.
  const onStatsRef = useRef(onStats);
  const onGameOverRef = useRef(onGameOver);
  useEffect(() => {
    onStatsRef.current = onStats;
    onGameOverRef.current = onGameOver;
  });
  // Crea, arranca y destruye el motor (seguro con el doble montaje de Strict Mode)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = createAsteroidsEngine(canvas, {
      onStats: (stats) => onStatsRef.current(stats),
      onGameOver: (result) => onGameOverRef.current(result),
    });
    engineRef.current = engine;
    engine.start();
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);
  // Sincroniza la pausa de la plataforma con el motor
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (paused) engine.pause();
    else engine.resume();
  }, [paused]);
  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      aria-label="Juego ASTEROIDES"
      className="asteroids-canvas"
      style={{
        display: "block",
        width: "100%",
        height: "auto",
        aspectRatio: "4 / 3",
        background: "#000",
      }}
    />
  );
}
