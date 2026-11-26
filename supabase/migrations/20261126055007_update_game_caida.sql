-- SPEC 07: CAÍDA pasa de simulado a juego real.
-- Solo cambia la descripción larga; el resto de columnas de la fila se conserva.
update public.games
set long = 'Ocho piezas distintas, incluida una tuerca hueca, caen sobre un pozo de 10 × 20. Muévelas, rótalas y suéltalas de golpe guiándote por su sombra para completar líneas. Cada 10 líneas subes de nivel y la caída se acelera.'
where id = 'caida';
