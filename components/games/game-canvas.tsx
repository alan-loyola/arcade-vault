"use client";
import { useEffect, useRef } from "react";
import type {
  CreateGameEngine,
  GameCallbacks,
  GameEngine,
} from "@/lib/game-engine";
interface GameCanvasProps {
  createEngine: CreateGameEngine;
  width: number; // resolución lógica fija; el escalado es por CSS
  height: number;
  label: string;
  paused: boolean;
  onStats: GameCallbacks["onStats"];
  onGameOver: GameCallbacks["onGameOver"];
}
// Monta cualquier motor real que cumpla CreateGameEngine sobre un <canvas>.
export function GameCanvas({
  createEngine,
  width,
  height,
  label,
  paused,
  onStats,
  onGameOver,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
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
    const engine = createEngine(canvas, {
      onStats: (stats) => onStatsRef.current(stats),
      onGameOver: (result) => onGameOverRef.current(result),
    });
    engineRef.current = engine;
    engine.start();
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [createEngine]);
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
      width={width}
      height={height}
      aria-label={label}
      className="game-canvas"
    />
  );
}
