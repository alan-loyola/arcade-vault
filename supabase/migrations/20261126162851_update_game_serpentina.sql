-- SPEC 09: SERPENTINA pasa de simulado a juego real.
-- Solo cambia la descripción larga; el resto de columnas de la fila se conserva.
update public.games
set long = 'Guía la serpiente de neón con las flechas o WASD y come frutas para crecer: cada una vale 10 puntos por nivel. Cada cinco frutas sube el nivel, la serpiente acelera y aparece durante seis segundos una estrella dorada que vale 50 puntos por nivel. Chocar con la pared o con tu propia cola termina la partida.'
where id = 'serpentina';
