"use server";

import { Resend } from "resend";

export interface ContactInput {
  name: string; // 1–80 caracteres tras trim
  email: string; // formato válido, ≤ 254
  message: string; // 1–2000 caracteres tras trim
}

export type ContactState =
  | { status: "idle" }
  | { status: "success"; name: string }
  | { status: "error"; reason: "validation" | "send"; message: string };

const NAME_MAX = 80;
const EMAIL_MAX = 254;
const MESSAGE_MAX = 2000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SEND_ERROR: ContactState = {
  status: "error",
  reason: "send",
  message: "No pudimos enviar tu mensaje. Inténtalo de nuevo en unos minutos.",
};

function field(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function validate(
  input: ContactInput,
): { ok: true } | { ok: false; message: string } {
  if (!input.name || !input.email || !input.message) {
    return { ok: false, message: "Completa todos los campos." };
  }
  if (input.name.length > NAME_MAX) {
    return {
      ok: false,
      message: `El nombre no puede superar ${NAME_MAX} caracteres.`,
    };
  }
  if (input.email.length > EMAIL_MAX || !EMAIL_RE.test(input.email)) {
    return { ok: false, message: "Introduce un correo electrónico válido." };
  }
  if (input.message.length > MESSAGE_MAX) {
    return {
      ok: false,
      message: `El mensaje no puede superar ${MESSAGE_MAX} caracteres.`,
    };
  }
  return { ok: true };
}

export async function sendContact(
  _prev: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const input: ContactInput = {
    // Sin saltos de línea: el nombre va en el asunto del correo.
    name: field(formData, "name").replace(/[\r\n]+/g, " ").trim(),
    email: field(formData, "email").trim(),
    message: field(formData, "message").trim(),
  };

  // Honeypot: un bot lo rellena; fingimos éxito sin enviar nada.
  if (field(formData, "website") !== "") {
    return { status: "success", name: input.name };
  }

  const result = validate(input);
  if (!result.ok) {
    return { status: "error", reason: "validation", message: result.message };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  const from = process.env.CONTACT_FROM_EMAIL;
  if (!apiKey || !to || !from) {
    console.error(
      "[contact] Faltan variables de entorno: RESEND_API_KEY, CONTACT_TO_EMAIL o CONTACT_FROM_EMAIL.",
    );
    return SEND_ERROR;
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: `Arcade Vault <${from}>`,
      to,
      replyTo: input.email,
      subject: `[Arcade Vault] Mensaje de ${input.name}`,
      text: `Nombre: ${input.name}\nCorreo: ${input.email}\n\n${input.message}`,
    });
    if (error) {
      console.error("[contact] Resend devolvió un error:", error);
      return SEND_ERROR;
    }
  } catch (err) {
    console.error("[contact] Fallo al enviar con Resend:", err);
    return SEND_ERROR;
  }

  return { status: "success", name: input.name };
}
