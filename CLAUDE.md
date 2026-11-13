# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Arcade Vault: a platform to play games online and compete for the highest score. Currently a fresh Create Next App scaffold (a single `app/page.tsx`, no tests). The README (in Spanish) says development follows spec-driven design using `/spec` and `/spec-impl`, with skills installed via `npx skills@latest add Klerith/fernando-skills`.

## Next.js version caveat

Next 16.4.6 / React 19.3 — APIs differ from older training data. Per `AGENTS.md`, read the relevant guide in `node_modules/next/dist/docs/` (`01-app`, `02-pages`, `03-architecture`, `04-community`; start at `index.md`) before writing Next code, and heed deprecation notices. `AGENTS.md` is re-added by `next dev`, so commit it rather than removing it.

## Architecture notes

- App Router only (`app/`). The root layout uses the globally-typed `LayoutProps<"/">` helper (no import needed).
- `next.config.ts` enables `cacheComponents`, `partialPrefetching` and `experimental.agentFeedback`. `cacheComponents` changes caching/dynamic-rendering semantics, so check the docs before using data fetching, `cookies()`/`headers()`, or route segment config.
- Tailwind CSS v4 is wired through Turbopack, not PostCSS: `next.config.ts` has a `turbopack.rules` entry running `@tailwindcss/turbopack` on `*.css` (there is no `postcss.config`). Theme tokens (`--background`, `--foreground`, fonts) are defined in `app/globals.css` via `@theme inline`, with dark mode through `prefers-color-scheme`.
- Fonts: Geist Sans/Mono loaded with `next/font/google` in `app/layout.tsx` as CSS variables.

## Skills

Usa siempre /frontend-design para diseñar la interfaz de usuario.