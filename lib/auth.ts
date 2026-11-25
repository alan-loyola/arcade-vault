import { cache } from "react";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
export interface CurrentUser {
  id: string;
  username: string;
}
// Lee la sesión desde las cookies (dato de petición): quien lo llame debe
// estar dentro de un <Suspense> (cacheComponents). `cache` deduplica la
// lectura dentro de una misma petición.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  // Dato de petición: evita que Supabase (Date.now() al validar el JWT) se
  // evalúe durante el prerender.
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) return null;
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    console.error("getCurrentUser:", error);
    return null;
  }
  if (!profile) return null;
  return { id: userId, username: profile.username };
});
