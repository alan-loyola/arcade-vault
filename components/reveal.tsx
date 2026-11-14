"use client";

import { useEffect } from "react";

/**
 * Anima la aparición al hacer scroll: cuando un elemento `.reveal` entra en el
 * viewport (threshold 0.12) se le añade la clase `in` y deja de observarse.
 * No renderiza nada; basta con montarlo una vez dentro de la página.
 */
export function Reveal() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".reveal");

    // Sin IntersectionObserver no hay nada que esperar: mostrar todo.
    if (typeof IntersectionObserver === "undefined") {
      els.forEach((el) => el.classList.add("in"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 },
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return null;
}
