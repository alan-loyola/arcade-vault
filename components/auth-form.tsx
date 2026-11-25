"use client";
import { useActionState, useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn, signUp } from "@/app/auth/actions";
import type { AuthState } from "@/lib/scores";
const IDLE: AuthState = { status: "idle" };
export function AuthForm() {
  const router = useRouter();
  const [tab, setTab] = useState<"in" | "up">("in");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [email, setEmail] = useState("");
  const [inState, inAction, inPending] = useActionState(signIn, IDLE);
  const [upState, upAction, upPending] = useActionState(signUp, IDLE);
  const state = tab === "in" ? inState : upState;
  const pending = tab === "in" ? inPending : upPending;
  // Se invoca la acción a mano (sin el reset automático de <form action>)
  // para conservar lo escrito cuando el servidor devuelve un error.
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => (tab === "in" ? inAction : upAction)(data));
  };
  return (
    <div className="av-auth-wrap fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <div className="mark"></div>
          <h2 className="neon-cyan">ARCADE VAULT</h2>
          <div
            className="mono"
            style={{
              fontSize: 11,
              color: "var(--ink-faint)",
              letterSpacing: "0.16em",
              marginTop: 6,
            }}
          >
            ACCESO AL SISTEMA · v2.6
          </div>
        </div>
        <div className="auth-tabs">
          <button
            type="button"
            className={tab === "in" ? "on" : ""}
            onClick={() => setTab("in")}
          >
            INICIAR SESIÓN
          </button>
          <button
            type="button"
            className={tab === "up" ? "on" : ""}
            onClick={() => setTab("up")}
          >
            CREAR CUENTA
          </button>
        </div>
        <form onSubmit={submit}>
          {tab === "up" && (
            <div className="field slide-in">
              <label>Usuario</label>
              <input
                name="username"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                placeholder="px_kai"
                autoComplete="username"
                minLength={3}
                maxLength={12}
                required
              />
            </div>
          )}
          <div className="field">
            <label>Correo</label>
            <input
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jugador@vault.gg"
              autoComplete="email"
              required
            />
          </div>
          <div className="field">
            <label>Contraseña</label>
            <input
              name="password"
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="••••••••"
              autoComplete={tab === "in" ? "current-password" : "new-password"}
              minLength={tab === "up" ? 8 : undefined}
              required
            />
          </div>
          {state.status === "error" && (
            <div
              role="alert"
              className="mono neon-magenta"
              style={{ fontSize: 11, letterSpacing: "0.1em", marginTop: 4 }}
            >
              {state.message}
            </div>
          )}
          <button
            className="btn lg"
            type="submit"
            disabled={pending}
            style={{ width: "100%", marginTop: 8 }}
          >
            {pending
              ? "CONECTANDO…"
              : tab === "in"
                ? "ENTRAR AL VAULT"
                : "CREAR Y JUGAR"}
          </button>
        </form>
        <button
          type="button"
          className="btn ghost"
          style={{ width: "100%", marginTop: 10 }}
          onClick={() => router.push("/juegos")}
        >
          JUGAR COMO INVITADO
        </button>
        <div className="auth-divider">O CONTINÚA CON</div>
        <div className="social">
          <button className="btn ghost" type="button">
            ◆ GOOGLE
          </button>
          <button className="btn ghost" type="button">
            ▣ GITHUB
          </button>
        </div>
        <div
          style={{
            marginTop: 18,
            textAlign: "center",
            fontSize: 11,
            color: "var(--ink-faint)",
            letterSpacing: "0.1em",
          }}
        >
          AL ENTRAR ACEPTAS LOS TÉRMINOS DEL SALÓN ARCADE
        </div>
      </div>
    </div>
  );
}
