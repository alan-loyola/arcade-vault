"use client";

import { useActionState, useState } from "react";
import { sendContact, type ContactState } from "@/app/acerca/actions";

const INITIAL: ContactState = { status: "idle" };

/**
 * Formulario de contacto. Al pulsar "ENVIAR OTRO MENSAJE" se remonta el
 * formulario interno (cambia `key`), lo que reinicia tanto el estado de la
 * acción como los campos.
 */
export function ContactForm() {
  const [session, setSession] = useState(0);
  return (
    <ContactFormInner
      key={session}
      onReset={() => setSession((n) => n + 1)}
    />
  );
}

function ContactFormInner({ onReset }: { onReset: () => void }) {
  const [fields, setFields] = useState({ name: "", email: "", message: "" });
  const [shake, setShake] = useState(false);

  const [state, formAction, pending] = useActionState(
    async (prev: ContactState, formData: FormData) => {
      const next = await sendContact(prev, formData);
      if (next.status === "error" && next.reason === "validation") {
        setShake(true);
      }
      return next;
    },
    INITIAL,
  );

  const set =
    (key: keyof typeof fields) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setFields((f) => ({ ...f, [key]: e.target.value }));

  return (
    <form
      className={"contact-form" + (shake ? " shake" : "")}
      action={formAction}
      noValidate
      onAnimationEnd={() => setShake(false)}
    >
      {state.status === "success" ? (
        <div className="terminal-success">
          <div className="term-bar">
            <span className="dot r" />
            <span className="dot y" />
            <span className="dot g" />
            <span className="term-title">VAULT-OS // TERMINAL</span>
          </div>
          <div className="term-body" role="status">
            <div className="line">
              <span className="prompt">vault@arcade:~$</span> ./send_message
              --to=team
            </div>
            <div className="line dim">[OK] Conectando con servidor…</div>
            <div className="line dim">[OK] Validando contenido…</div>
            <div className="line dim">[OK] Transmitiendo paquete…</div>
            <div className="line success">
              &gt; MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS,{" "}
              {state.name.toUpperCase()}.<span className="caret">_</span>
            </div>
            <div style={{ marginTop: 18 }}>
              <button className="btn ghost" type="button" onClick={onReset}>
                ENVIAR OTRO MENSAJE
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {state.status === "error" && (
            <p className="form-error" role="alert">
              {state.message}
            </p>
          )}

          <div className="field">
            <label htmlFor="contact-name">NOMBRE</label>
            <input
              id="contact-name"
              name="name"
              value={fields.name}
              onChange={set("name")}
              placeholder="px_kai"
              autoComplete="name"
            />
          </div>
          <div className="field">
            <label htmlFor="contact-email">CORREO ELECTRÓNICO</label>
            <input
              id="contact-email"
              name="email"
              type="email"
              value={fields.email}
              onChange={set("email")}
              placeholder="jugador@vault.gg"
              autoComplete="email"
            />
          </div>
          <div className="field">
            <label htmlFor="contact-message">MENSAJE</label>
            <textarea
              id="contact-message"
              name="message"
              rows={5}
              value={fields.message}
              onChange={set("message")}
              placeholder="Cuéntanos qué tienes en mente…"
            />
          </div>

          {/* Honeypot: invisible para personas, los bots suelen rellenarlo. */}
          <div className="hp-field" aria-hidden="true">
            <label htmlFor="contact-website">No rellenar este campo</label>
            <input
              id="contact-website"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              defaultValue=""
            />
          </div>

          <button
            className="btn xl press"
            type="submit"
            style={{ width: "100%" }}
            disabled={pending}
          >
            {pending ? "ENVIANDO…" : "▶  ENVIAR MENSAJE"}
          </button>
        </>
      )}
    </form>
  );
}
