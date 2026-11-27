# TO DO — Sugerencias de juegos (game-planner)

Última actualización: 2026-11-26

## Pendientes

- [ ] `invasores` — INVASORES · SHOOTER · green · esfuerzo M · diseño nuevo (sin port) — convierte en real el shooter simulado más reconocible; SHOOTER solo tiene 1 real de 3; mecánica en rejilla, teclado (← → + ESPACIO), puntuación por alien y nivel por oleada (sugerido 2026-11-26)
- [ ] `ranaria` — RANARIA · ARCADE · green · esfuerzo M · diseño nuevo — simulado → real; movimiento por casillas (como SERPENTINA), puntuación por avance/llegada y nivel por ronda; riesgo: muchos carriles y temporizador (sugerido 2026-11-26)
- [ ] `duelo-pixel` — DUELO PIXEL · VERSUS · cyan · esfuerzo S · diseño nuevo — único VERSUS del catálogo, sin ningún real; física reutilizable de BLOQUE BUSTER; solo modo vs CPU para tener puntuación de leaderboard (puntos por rally, nivel por set) (sugerido 2026-11-26)

### Shooter

- [ ] `tormenta` — TORMENTA · SHOOTER · cyan · esfuerzo M · diseño nuevo — nave con scroll vertical contra escuadrillas en patrones, power-ups de disparo (doble/abanico); puntos por enemigo + bonus por oleada, nivel cada 5 oleadas, 3 vidas; reutiliza balas/colisiones de ASTEROIDES; diferenciar de INVASORES (scroll y formaciones móviles vs rejilla fija) (sugerido 2026-11-26)
- [ ] `bastion` — BASTIÓN · SHOOTER · yellow · esfuerzo M · diseño nuevo — defensa: mira con flechas y ESPACIO lanza explosiones que interceptan misiles sobre 6 ciudades; puntos por misil + bonus por ciudades y munición, nivel = ronda, ciudades = vidas; canvas fijo, bajo riesgo (sugerido 2026-11-26)
- [ ] `arena-neon` — ARENA NEÓN · SHOOTER · magenta · esfuerzo M · diseño nuevo — arena cenital, WASD mueve y flechas disparan en 4/8 direcciones contra hordas; puntos con multiplicador por racha sin daño, nivel = horda, 3 vidas; alta rejugabilidad (sugerido 2026-11-26)
- [ ] `enjambre` — ENJAMBRE · SHOOTER · green · esfuerzo M · diseño nuevo — cañón inferior contra criatura segmentada que baja en zigzag; cada segmento destruido se vuelve obstáculo; puntos por segmento/cabeza/obstáculo, nivel por criatura eliminada, 3 vidas; rejilla como SERPENTINA (sugerido 2026-11-26)
- [ ] `gruta` — GRUTA · SHOOTER · cyan · esfuerzo L · diseño nuevo — nave con scroll horizontal por caverna procedural, torretas y combustible; puntos por distancia y torretas, nivel = tramo, 3 vidas; riesgo: terreno procedural; se solapa con CAVERNA (elegir uno) (sugerido 2026-11-26)

### Arcade / acción

- [ ] `caverna` — CAVERNA · ARCADE · cyan · esfuerzo S · diseño nuevo — nave de un botón (mantener ESPACIO sube) por túnel que se estrecha; puntos por distancia + cristales, nivel cada 500 m, 3 vidas; se solapa con GRUTA (preferible por esfuerzo) (sugerido 2026-11-26)
- [ ] `chubasco` — CHUBASCO · ARCADE · magenta · esfuerzo S · diseño nuevo — esquivar gotas, granizo y rayos con aviso en una pantalla (← → + dash); puntos por segundo vivo + casi-roces + paraguas escudo, nivel cada 30 s, 3 vidas; colisiones simples (sugerido 2026-11-26)
- [ ] `catacumba` — CATACUMBA · ARCADE · magenta · esfuerzo M · diseño nuevo — laberinto con niebla y antorcha que se apaga: encontrar llave y salida esquivando espectros, movimiento por casillas; puntos por llave/salida/antorcha/monedas, nivel = profundidad, 3 vidas; riesgo: generador de laberintos y máscara de niebla (sugerido 2026-11-26)
- [ ] `andamio` — ANDAMIO · ARCADE · yellow · esfuerzo M · diseño nuevo — plataformas de una pantalla: obrero sube un andamio con escaleras y saltos esquivando ladrillos y cubos; puntos por esquivar, remaches y llegar arriba, nivel = andamio, 3 vidas; único plataformas; riesgo: física de salto/escaleras (sugerido 2026-11-26)
- [ ] `recorte` — RECORTE · ARCADE · yellow · esfuerzo L · diseño nuevo — conquistar territorio trazando líneas desde el borde mientras una chispa rebota dentro; puntos por % de área, nivel al superar 75%, 3 vidas; riesgo: flood fill y casos límite (sugerido 2026-11-26)

### Puzzle / estrategia

- [ ] `joyero` — JOYERO · PUZZLE · yellow · esfuerzo M · diseño nuevo — emparejar 3 en rejilla 8x8 con cursor e intercambio, cascadas y barra de tiempo; puntos × multiplicador de cascada, nivel por puntos, 1 vida (tiempo); rejilla/gravedad de CAÍDA (sugerido 2026-11-26)
- [ ] `pompas` — POMPAS · PUZZLE · cyan · esfuerzo M · diseño nuevo — cañón giratorio dispara pompas que rebotan; 3+ iguales revientan y caen las colgantes, el techo baja; puntos por pompas + colgantes, nivel = tablero despejado, 3 vidas; rebotes de BLOQUE BUSTER (sugerido 2026-11-26)
- [ ] `triada` — TRÍADA · PUZZLE · green · esfuerzo S · diseño nuevo — columna de 3 gemas que cae, se rota el orden; 3+ en línea (incl. diagonal) con cadenas; puntos × cadena, nivel por gemas, 1 vida; riesgo: redundante con CAÍDA (sugerido 2026-11-26)
- [ ] `fusion` — FUSIÓN · PUZZLE · magenta · esfuerzo S · diseño nuevo — rejilla 4x4, deslizar fichas que se funden al chocar iguales; puntos = suma fusionada, nivel = rango de ficha máxima, 1 vida; por turnos, bajo riesgo; necesita arte y reglas propias para no copiar juegos conocidos (sugerido 2026-11-26)
- [ ] `caudal` — CAUDAL · PUZZLE · cyan · esfuerzo M · diseño nuevo — colocar tuberías de una cola antes de que avance el líquido, recorrido mínimo de N tramos; puntos por tramo + cruces, nivel por recorrido cumplido, 3 vidas; riesgo: animar el flujo por casillas (sugerido 2026-11-26)

### Versus / deportes / carreras

- [ ] `hielo-neon` — HIELO NEÓN · VERSUS · magenta · esfuerzo S · diseño nuevo — hockey de mesa cenital contra CPU; +100×nivel por gol, nivel cada 5 goles, 5 vidas (goles recibidos); física de BLOQUE BUSTER; primer VERSUS real (sugerido 2026-11-26)
- [ ] `estela` — ESTELA · VERSUS · cyan · esfuerzo S · diseño nuevo — motos en rejilla que dejan estela, encerrar a 1–3 motos CPU; +10 por tick, +500 por rival, nivel por ronda, 3 vidas; rejilla de SERPENTINA (sugerido 2026-11-26)
- [ ] `volea` — VOLEA · VERSUS · green · esfuerzo M · diseño nuevo — voleibol lateral 1 contra 1 contra CPU con salto; +100×nivel por punto + racha, nivel por set (a 7), 5 vidas; gravedad y colisión círculo-círculo (sugerido 2026-11-26)
- [ ] `carril-rapido` — CARRIL RÁPIDO · ARCADE · yellow · esfuerzo S · diseño nuevo — carrera vertical sin fin cambiando de carril, esquivando tráfico y recogiendo combustible; puntos por distancia + adelantamientos, nivel cada 1000 m, 3 vidas (sugerido 2026-11-26)
- [ ] `vuelta-rapida` — VUELTA RÁPIDA · VERSUS · magenta · esfuerzo L · diseño nuevo — circuito cenital, 3 vueltas contra 3 coches CPU por waypoints; puntos por posición + tiempo + vuelta rápida, nivel = circuito, 3 créditos; riesgo: física del coche, IA y pistas (sugerido 2026-11-26)

## En curso

## Implementados

- [x] `asteroids` — ASTEROIDES · SHOOTER · magenta
- [x] `caida` — CAÍDA · PUZZLE · magenta
- [x] `bloque-buster` — BLOQUE BUSTER · ARCADE · cyan
- [x] `serpentina` — SERPENTINA · ARCADE · green

## Descartados
