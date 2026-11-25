import { getCurrentUser } from "@/lib/auth";
import { Nav } from "@/components/nav";
// Lee la sesión (dato de petición), así que se renderiza dentro de <Suspense>.
export async function NavWithUser() {
  const user = await getCurrentUser();
  return <Nav user={user} />;
}
