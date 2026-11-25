"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import type { CurrentUser } from "@/lib/auth";
// user: undefined = cargando la sesión, null = invitado.
export function Nav({ user }: { user: CurrentUser | null | undefined }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isLibrary = pathname.startsWith("/juegos");
  const isHall = pathname.startsWith("/salon");
  const isAbout = pathname.startsWith("/acerca");
  const isAuth = pathname.startsWith("/auth");
  const close = () => setOpen(false);
  return (
    <>
      <nav className="av-nav">
        <Link href="/" className="logo" onClick={close}>
          <div className="logo-mark"></div>
          <div className="logo-text neon-cyan">
            ARCADE <span className="neon-magenta">VAULT</span>
          </div>
        </Link>
        <div className="links">
          <Link href="/" className={isHome ? "active" : ""}>
            Inicio
          </Link>
          <Link href="/juegos" className={isLibrary ? "active" : ""}>
            Biblioteca
          </Link>
          <Link href="/salon" className={isHall ? "active" : ""}>
            Salón de la Fama
          </Link>
          <Link href="/acerca" className={isAbout ? "active" : ""}>
            Acerca de
          </Link>
        </div>
        <div className="spacer"></div>
        <div className="coin-counter">
          <span className="coin"></span>
          <span>CRÉDITOS · 03</span>
        </div>
        {user === undefined ? (
          <span
            className="btn auth-btn"
            aria-hidden
            style={{ visibility: "hidden" }}
          >
            Iniciar Sesión
          </span>
        ) : user ? (
          <>
            <span
              className="mono neon-cyan"
              style={{ fontSize: 12, marginLeft: 16 }}
            >
              {user.username}
            </span>
            <form action={signOut}>
              <button type="submit" className="btn ghost auth-btn">
                CERRAR SESIÓN
              </button>
            </form>
          </>
        ) : (
          <Link href="/auth" className="btn auth-btn">
            Iniciar Sesión
          </Link>
        )}
        <button
          type="button"
          className="btn ghost hamburger"
          onClick={() => setOpen(true)}
          aria-label="Menú"
        >
          ≡
        </button>
      </nav>
      <div
        className={"av-mobile-backdrop" + (open ? " open" : "")}
        onClick={close}
      ></div>
      <aside className={"av-mobile-panel" + (open ? " open" : "")}>
        <div
          className="pixel neon-cyan"
          style={{ fontSize: 11, marginBottom: 16 }}
        >
          MENÚ
        </div>
        <Link href="/" className={isHome ? "active" : ""} onClick={close}>
          Inicio
        </Link>
        <Link
          href="/juegos"
          className={isLibrary ? "active" : ""}
          onClick={close}
        >
          Biblioteca
        </Link>
        <Link href="/salon" className={isHall ? "active" : ""} onClick={close}>
          Salón de la Fama
        </Link>
        <Link
          href="/acerca"
          className={isAbout ? "active" : ""}
          onClick={close}
        >
          Acerca de
        </Link>
        {user ? (
          <>
            <div
              className="mono neon-cyan"
              style={{ fontSize: 12, padding: "8px 0" }}
            >
              {user.username}
            </div>
            <form action={signOut}>
              <button type="submit" className="btn ghost" onClick={close}>
                CERRAR SESIÓN
              </button>
            </form>
          </>
        ) : user === null ? (
          <Link href="/auth" className={isAuth ? "active" : ""} onClick={close}>
            Iniciar Sesión
          </Link>
        ) : null}
        <div style={{ flex: 1 }}></div>
        <div
          className="pixel"
          style={{
            fontSize: 9,
            color: "var(--ink-faint)",
            letterSpacing: "0.16em",
          }}
        >
          CRÉDITOS · 03
        </div>
      </aside>
    </>
  );
}
