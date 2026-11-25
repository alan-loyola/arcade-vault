import { cacheLife } from "next/cache";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import type { Tables } from "@/lib/supabase/database.types";
import type {
  AccentColor,
  Category,
  Game,
  GameWithStats,
} from "@/lib/game-types";
// Solo servidor. Los Client Components importan de "@/lib/game-types".
export { CATS } from "@/lib/game-types";
export type { AccentColor, Category, Game, GameWithStats };
const GAME_COLUMNS = "id, title, short, long, cat, color, cover";
type GameRow = Pick<
  Tables<"games">,
  "id" | "title" | "short" | "long" | "cat" | "color" | "cover"
>;
// `cat` y `color` están restringidos por CHECK en la BD, así que el cast es seguro.
function toGame(row: GameRow): Game {
  return {
    id: row.id,
    title: row.title,
    short: row.short,
    long: row.long,
    cat: row.cat as Category,
    cover: row.cover,
    color: row.color as AccentColor,
  };
}
// Catálogo ordenado por `sort_order`, sin estadísticas.
// Lee datos de petición: llamar dentro de <Suspense>.
export async function getGames(): Promise<Game[]> {
  await connection();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("games")
    .select(GAME_COLUMNS)
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("getGames:", error);
    return [];
  }
  return data.map(toGame);
}
// Ids del catálogo para generateStaticParams. En build no hay petición
// (sin cookies ni connection()), así que usa el cliente público y se cachea.
export async function getGameIds(): Promise<{ id: string }[]> {
  "use cache";
  cacheLife("hours");
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("games")
    .select("id")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data;
}
// Un juego por id, o null si no existe.
export async function getGame(id: string): Promise<Game | null> {
  await connection();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("games")
    .select(GAME_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("getGame:", error);
    return null;
  }
  return data ? toGame(data) : null;
}
// Catálogo con `best` y `plays` reales (vista game_stats). Una consulta por
// tabla, sin consultas por juego. Los juegos sin partidas se completan con 0.
export async function getGamesWithStats(): Promise<GameWithStats[]> {
  await connection();
  const supabase = await createClient();
  const [gamesRes, statsRes] = await Promise.all([
    supabase
      .from("games")
      .select(GAME_COLUMNS)
      .order("sort_order", { ascending: true }),
    supabase.from("game_stats").select("game_id, best, plays"),
  ]);
  if (gamesRes.error) {
    console.error("getGamesWithStats (games):", gamesRes.error);
    return [];
  }
  if (statsRes.error) {
    console.error("getGamesWithStats (stats):", statsRes.error);
  }
  const stats = new Map(
    (statsRes.data ?? []).map((s) => [
      s.game_id,
      { best: s.best ?? 0, plays: s.plays ?? 0 },
    ]),
  );
  return gamesRes.data.map((row) => ({
    ...toGame(row),
    best: stats.get(row.id)?.best ?? 0,
    plays: stats.get(row.id)?.plays ?? 0,
  }));
}
