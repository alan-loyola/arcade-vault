import { createServerClient } from "@supabase/ssr";
import type { Database } from "./database.types";
// Cliente anónimo sin cookies, para leer datos públicos dentro de funciones
// con "use cache" o en build (generateStaticParams), donde cookies() no existe.
export function createPublicClient() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {},
      },
    },
  );
}
