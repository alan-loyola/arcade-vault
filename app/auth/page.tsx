import { AuthForm } from "@/components/auth-form";
// Con sesión activa, proxy.ts redirige /auth a /juegos antes de renderizar.
export default function AuthPage() {
  return <AuthForm />;
}
