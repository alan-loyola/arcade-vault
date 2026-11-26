-- SPEC 08: BLOQUE BUSTER pasa de simulado a juego real.
-- Solo cambia la descripción larga; el resto de columnas de la fila se conserva.
update public.games
set long = 'Mueve la paleta con el ratón o las flechas y rebota la pelota para romper muros de bloques de colores. Cinco niveles con patrones distintos y una pelota cada vez más rápida. Tienes tres vidas: cada pelota que cae te cuesta una.'
where id = 'bloque-buster';
