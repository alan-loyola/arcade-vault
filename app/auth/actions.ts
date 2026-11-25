"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AuthState } from "@/lib/scores";
const USERNAME_RE = /^[A-Za-z0-9_]{3,12}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;
const GENERIC_ERROR = "NO SE PUDO COMPLETAR LA OPERACIÓN. INTÉNTALO DE NUEVO.";
function fail(message: string): AuthState {
  return { status: "error", message };
}
function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}
export async function signIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = field(formData, "email");
  const password = String(formData.get("password") ?? "");
  if (!EMAIL_RE.test(email) || password.length === 0) {
    return fail("CORREO O CONTRASEÑA INCORRECTOS");
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.code !== "invalid_credentials") {
      console.error("signIn:", error);
      return fail(GENERIC_ERROR);
    }
    return fail("CORREO O CONTRASEÑA INCORRECTOS");
  }
  redirect("/juegos");
}
export async function signUp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const username = field(formData, "username");
  const email = field(formData, "email");
  const password = String(formData.get("password") ?? "");
  if (!USERNAME_RE.test(username)) {
    return fail("USUARIO: 3-12 CARACTERES (LETRAS, NÚMEROS O _)");
  }
  if (!EMAIL_RE.test(email)) {
    return fail("CORREO ELECTRÓNICO NO VÁLIDO");
  }
  if (password.length < MIN_PASSWORD) {
    return fail(`LA CONTRASEÑA DEBE TENER AL MENOS ${MIN_PASSWORD} CARACTERES`);
  }
  const supabase = await createClient();
  // Pre-validación de unicidad: el error del trigger de Postgres es opaco.
  const { data: existing, error: lookupError } = await supabase
    .from("profiles")
    .select("id")
    .ilike("username", username)
    .maybeSingle();
  if (lookupError) {
    console.error("signUp (lookup):", lookupError);
    return fail(GENERIC_ERROR);
  }
  if (existing) {
    return fail("USUARIO YA EN USO");
  }
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } },
  });
  if (error) {
    if (error.code === "user_already_exists") {
      return fail("CORREO YA REGISTRADO");
    }
    console.error("signUp:", error);
    return fail(GENERIC_ERROR);
  }
  // Sin sesión = el proyecto tiene la confirmación de correo activada.
  if (!data.session) {
    console.error(
      "signUp: no session returned; ¿confirmación de correo activada en Supabase?",
    );
    return fail("CUENTA CREADA, PERO LA CONFIRMACIÓN DE CORREO ESTÁ ACTIVA");
  }
  redirect("/juegos");
}
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) console.error("signOut:", error);
  redirect("/auth");
}
