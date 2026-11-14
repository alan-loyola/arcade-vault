# SPEC 03 — Acerca de y formulario de contacto con Resend

> **Estado:** Implementado
> **Depende de:** SPEC 01, SPEC 02
> **Fecha:** 2026-11-14
> **Objetivo:** Portar la pantalla "Acerca de" de `references/templates/home-about/about.jsx` a Next.js como la ruta `/acerca`, con un formulario de contacto que envía el mensaje por correo usando Resend desde una Server Action.

---

## Por qué existe este spec

SPEC 02 dejó "Acerca de" y el contacto fuera de alcance. El template `home-about` ya define el diseño completo (misión, tres highlights, divisor pixelado, formulario y terminal de éxito), y el pedido es reproducirlo igual. Lo nuevo respecto al template es que el formulario deja de ser una simulación: el envío real requiere un servicio de correo (Resend), secretos en variables de entorno y validación en servidor. No se rediseña; se porta y se conecta.

---

## Alcance

**Dentro:**

- Nueva pantalla en `/acerca` con las secciones del template: hero "ACERCA DE ARCADE VAULT" (misión + 3 highlights con icono pixel), divisor pixelado y sección "CONTÁCTANOS" (intro con 3 tips + formulario).
- Formulario con campos NOMBRE, CORREO ELECTRÓNICO y MENSAJE, botón "▶ ENVIAR MENSAJE", animación `shake` ante error de validación y terminal de éxito con "ENVIAR OTRO MENSAJE", como en el template.
- Envío del correo con Resend desde una Server Action (`app/acerca/actions.ts`).
- Validación en servidor (campos obligatorios, formato de email, longitudes máximas), estado de error visible si el envío falla y campo honeypot anti-bots.
- Nav: añadir el link "Acerca de" (`/acerca`) después de "Salón de la Fama", en barra y panel móvil, con estado activo.
- Reutilizar `components/reveal.tsx` (SPEC 02) para las clases `.reveal` / `.in`.
- Portar a `app/globals.css` el bloque `ABOUT PAGE` de `references/templates/home-about/styles.css` (incluye `.contact-form.shake`, `@keyframes shake` y `.terminal-success`), sin duplicar reglas existentes.
- Variables de entorno `RESEND_API_KEY`, `CONTACT_TO_EMAIL` y `CONTACT_FROM_EMAIL`, documentadas en `.env.example`.

**Fuera de alcance (para otros specs):**

- Rate limiting por IP o cualquier almacenamiento para ello (Upstash, Redis, etc.).
- Dominio propio verificado en Resend (se documenta como paso opcional, no se implementa).
- Correo de confirmación al visitante, plantillas HTML/React Email y adjuntos.
- Guardar los mensajes en base de datos o panel de administración.
- Captcha (Turnstile, reCAPTCHA).
- Cambios de diseño sobre el template.
- Tests automatizados.

---

## Modelo de datos

Estructuras nuevas, tipadas. Sin persistencia: el mensaje solo viaja por correo.

```ts
// app/acerca/actions.ts
export interface ContactInput {
  name: string;     // 1–80 caracteres tras trim
  email: string;    // formato válido, ≤ 254
  message: string;  // 1–2000 caracteres tras trim
}

export type ContactState =
  | { status: "idle" }
  | { status: "success"; name: string }
  | { status: "error"; reason: "validation" | "send"; message: string };

export async function sendContact(
  prev: ContactState,
  formData: FormData,
): Promise<ContactState>;
```

Campos del `FormData`: `name`, `email`, `message` y `website` (honeypot, oculto, debe llegar vacío).

Variables de entorno (solo servidor, nunca `NEXT_PUBLIC_`):

```
RESEND_API_KEY=re_xxx
CONTACT_TO_EMAIL=bandeja-destino@ejemplo.com
CONTACT_FROM_EMAIL=onboarding@resend.dev
```

Correo enviado: `from` = `Arcade Vault <CONTACT_FROM_EMAIL>`, `to` = `CONTACT_TO_EMAIL`, `replyTo` = email del visitante, `subject` = `[Arcade Vault] Mensaje de <name>` y cuerpo en texto plano (sin HTML, para evitar inyección).

Convenciones:

- Se eliminan saltos de línea del `name` antes de usarlo en el asunto.
- Honeypot con `website` no vacío: la acción devuelve `success` sin enviar nada.
- Errores de Resend o variables ausentes: se registran con `console.error` en servidor y al cliente solo llega un mensaje genérico.

---

## Plan de implementación

Antes del paso 1: leer en `node_modules/next/dist/docs/` lo relativo a Server Actions / `useActionState`, Client Components y `cacheComponents` (ver CLAUDE.md), y la documentación vigente de Resend para Node.

1. Instalar `resend` (`npm install resend`) y crear `.env.example` con las tres variables; añadir `!.env.example` a `.gitignore` (hoy `.env*` lo ignora). Verificación: `npx tsc --noEmit` sin errores y `.env.example` aparece en `git status`.
2. Crear `app/acerca/actions.ts` (`"use server"`) con `sendContact`: validación, honeypot, envío con Resend y retorno de `ContactState`. Verificación: tipos y `npm run lint` sin errores.
3. Portar estilos: copiar a `app/globals.css` el bloque `ABOUT PAGE` del template, revisando antes `.field`, `.btn` y `.neon-*` para no duplicar. Añadir estilos mínimos para el estado de error (`.form-error`) con las variables de color existentes y para ocultar el honeypot. Verificación: `npm run dev` sin errores de CSS.
4. Crear `components/about/highlight-icon.tsx` (Server Component, 3 iconos pixel: HEART, BROWSER, PLANT, `aria-hidden`). Verificación: tipos y lint.
5. Crear `app/acerca/page.tsx` (Server Component) con el hero, los 3 highlights y el divisor, montando `<Reveal />`, más metadata de título. El formulario aún es un placeholder. Verificación: `/acerca` muestra hero y highlights como en el template.
6. Crear `components/about/contact-form.tsx` (Client Component) con `useActionState(sendContact)`: campos controlados por `FormData`, botón con estado pendiente (`useFormStatus` o `isPending`), `shake` ante error de validación, mensaje de error y terminal de éxito con "ENVIAR OTRO MENSAJE" que reinicia el estado. Integrarlo en la sección CONTÁCTANOS (intro, tips). Verificación: con claves reales, un envío llega a la bandeja destino.
7. Actualizar `components/nav.tsx`: `isAbout = pathname.startsWith("/acerca")` y el link "Acerca de" en barra y panel móvil. Verificación: el link activo es correcto en `/acerca` y en el resto de rutas.
8. Revisión final: comparar `/acerca` con `arcade-vault-standalone.html` en escritorio y móvil, probar los casos de error y ejecutar `npm run lint` y `npm run build`.

---

## Criterios de aceptación

- [ ] `npm run lint` y `npm run build` terminan sin errores.
- [ ] La consola del navegador no muestra errores ni avisos de hidratación en `/acerca`.
- [ ] `/acerca` muestra el título "ACERCA DE ARCADE VAULT", el texto de misión, 3 highlights y el divisor pixelado.
- [ ] `/acerca` muestra "CONTÁCTANOS", los 3 tips ("RESPUESTA EN 24-48H", "SUGERENCIAS BIENVENIDAS", "SIN SPAM, JAMÁS") y los campos NOMBRE, CORREO ELECTRÓNICO y MENSAJE.
- [ ] Enviar con un campo vacío no envía correo, aplica la animación `shake` y muestra un mensaje de error.
- [ ] Enviar con un email mal formado, un nombre > 80 o un mensaje > 2000 caracteres es rechazado por el servidor.
- [ ] Un envío válido entrega un correo a `CONTACT_TO_EMAIL` con el asunto `[Arcade Vault] Mensaje de <nombre>`, el cuerpo con nombre, email y mensaje, y `Reply-To` igual al email del visitante.
- [ ] Tras un envío válido se muestra la terminal con "MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS, <NOMBRE EN MAYÚSCULAS>."
- [ ] "ENVIAR OTRO MENSAJE" vuelve al formulario con los campos vacíos.
- [ ] Si `RESEND_API_KEY` falta o Resend responde con error, el usuario ve un mensaje de error genérico, puede reintentar y la clave no aparece en el cliente ni en la respuesta.
- [ ] Con el campo honeypot relleno no se envía ningún correo y la interfaz muestra éxito.
- [ ] Mientras el envío está en curso el botón queda deshabilitado (sin doble envío).
- [ ] `RESEND_API_KEY` no aparece en el bundle del cliente (no existe con prefijo `NEXT_PUBLIC_`).
- [ ] `.env.example` está versionado y `.env.local` sigue ignorado por git.
- [ ] El nav muestra "Acerca de" (barra y panel móvil); está activo solo en `/acerca`.
- [ ] Las secciones con `.reveal` reciben la clase `in` al entrar en el viewport.

---

## Decisiones tomadas y descartadas

- **Sí:** ruta `/acerca`. Corta y en español, coherente con `/juegos` y `/salon`.
- **No:** `/about` (rompe la convención) y `/acerca-de` (innecesariamente larga).
- **Sí:** Server Action con `useActionState`. La clave de Resend queda en servidor y no hay endpoint público que mantener.
- **No:** Route Handler `POST /api/contact`. Más código sin otro consumidor que lo justifique.
- **Sí:** configuración por variables de entorno, con `onboarding@resend.dev` como remitente de pruebas. Funciona sin verificar dominio.
- **Sí:** `Reply-To` = email del visitante, para responder directo desde la bandeja.
- **Sí:** validación en servidor, estado de error y honeypot. El template solo comprueba campos vacíos en cliente, insuficiente para un envío real.
- **No:** rate limit. Requiere almacenamiento externo; si hay abuso va en otro spec.
- **Sí:** correo en texto plano. Evita inyección de HTML con contenido del visitante.
- **Sí:** reutilizar `Reveal` de SPEC 02 y portar el CSS tal cual a `globals.css`, como en SPEC 01 y 02.
- **Sí:** el link "Acerca de" entra al nav, revirtiendo la exclusión de SPEC 02, que dependía de que esta pantalla no existiera.
- **Sí:** solo `ContactForm` es Client Component; la página y los iconos son Server Components.

---

## Riesgos identificados

| Riesgo | Mitigación |
| --- | --- |
| Con `onboarding@resend.dev` Resend solo entrega al correo de la cuenta propietaria | `CONTACT_TO_EMAIL` debe ser ese correo en desarrollo; documentarlo en `.env.example`. Para producción, verificar un dominio. |
| `.env*` está en `.gitignore`, así que `.env.example` no se versiona | Paso 1 añade la excepción `!.env.example`. |
| Spam o abuso del formulario | Honeypot y límites de longitud; rate limit queda para otro spec. |
| Inyección de cabeceras vía `name` en el asunto | Se eliminan saltos de línea del `name` y el cuerpo va en texto plano. |
| La API de Resend o de Next 16 difiere de lo conocido | Leer las docs de `node_modules/next/dist/docs/` y de Resend antes de implementar (nota previa al paso 1). |
| Un fallo del envío deja al usuario sin feedback | Estado `error` con mensaje genérico y reintento; el detalle solo en `console.error` del servidor. |

---

## Qué **no** entra en este spec

- Rate limiting, captcha o cualquier protección más allá del honeypot y la validación.
- Correo de confirmación al visitante y plantillas HTML.
- Persistencia de mensajes o panel de administración.
- Configuración de dominio propio en Resend.
- Cambios de diseño respecto al template.
- Tests automatizados.
