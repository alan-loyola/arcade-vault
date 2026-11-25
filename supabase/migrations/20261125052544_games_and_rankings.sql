create table public.games (
  id text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  title text not null,
  short text not null,
  long text not null,
  cat text not null check (cat in ('ARCADE','PUZZLE','SHOOTER','VERSUS')),
  color text not null check (color in ('cyan','magenta','yellow','green')),
  cover text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.games enable row level security;
create policy "games_select_public" on public.games for select using (true);

insert into public.games (id, title, short, long, cat, color, cover, sort_order) values
('bloque-buster', 'BLOQUE BUSTER', 'Rebota la pelota y destruye muros de neón.', 'Pilota una nave-paleta y rebota un núcleo de plasma para pulverizar muros de bloques cromáticos. Cada nivel reorganiza la grilla en patrones imposibles. ¿Hasta dónde llegará tu racha?', 'ARCADE', 'cyan', 'cover-bricks', 1),
('caida', 'CAÍDA', 'Encaja las piezas antes de que el techo te aplaste.', 'Piezas geométricas descienden desde la oscuridad. Rótalas, encástralas y limpia líneas para sobrevivir. La velocidad aumenta sin piedad cada 10 líneas.', 'PUZZLE', 'magenta', 'cover-tetro', 2),
('serpentina', 'SERPENTINA', 'Crece sin morder tu propia cola.', 'Una serpiente de luz recorre la grilla buscando núcleos magenta. Cada bocado la alarga y la hace más veloz. Un movimiento en falso y se devora a sí misma.', 'ARCADE', 'green', 'cover-snake', 3),
('gloton', 'GLOTÓN', 'Devora puntos y escapa de los fantasmas.', 'Un círculo glotón patrulla un laberinto coleccionando puntos luminosos. Cuatro espectros lo persiguen, pero cada cierto tiempo aparece una píldora que invierte los papeles.', 'ARCADE', 'yellow', 'cover-glot', 4),
('invasores', 'INVASORES', 'Defiende el planeta de filas alienígenas.', 'Olas de pixeles hostiles descienden formación tras formación. Mueve tu cañón en horizontal y abre fuego con precisión, antes de que toquen la superficie.', 'SHOOTER', 'green', 'cover-invaders', 5),
('rocas', 'ROCAS', 'Pulveriza asteroides en gravedad cero.', 'Tu nave triangular flota en vacío absoluto. Dispara y rota para dividir rocas en fragmentos cada vez más pequeños. Cuidado con los OVNIs en el horizonte.', 'SHOOTER', 'yellow', 'cover-rocas', 6),
('asteroids', 'ASTEROIDES', 'Rota, acelera y dispara en gravedad cero.', 'Tu nave flota a la deriva en un campo de asteroides. Rota, impulsa y dispara para partir cada roca en fragmentos más pequeños. Recoge el power-up de disparo triple y limpia el sector para avanzar de nivel.', 'SHOOTER', 'magenta', 'cover-asteroids', 7),
('ranaria', 'RANARIA', 'Cruza la autopista de pixeles.', 'Salta entre carriles de coches a toda velocidad y troncos a la deriva en el río. Llega a los nenúfares antes de que se acabe el tiempo.', 'ARCADE', 'green', 'cover-rana', 8),
('duelo-pixel', 'DUELO PIXEL', 'Dos paletas. Una pelota. Reflejos máximos.', 'El duelo más puro: dos paletas verticales se enfrentan por rebotar una pelota luminosa. Modo solitario contra la CPU o partida local a dos jugadores.', 'VERSUS', 'cyan', 'cover-duelo', 9);

alter table public.scores
  add constraint scores_game_id_fkey
  foreign key (game_id) references public.games (id);

create view public.game_stats with (security_invoker = true) as
  select game_id, max(score) as best, count(*)::int as plays
  from public.scores
  group by game_id;

create view public.global_ranking with (security_invoker = true) as
  select p.id as user_id, p.username,
         sum(b.best)::int as total,
         count(*)::int as games_played
  from (
    select user_id, game_id, max(score) as best
    from public.scores
    group by user_id, game_id
  ) b
  join public.profiles p on p.id = b.user_id
  group by p.id, p.username;
