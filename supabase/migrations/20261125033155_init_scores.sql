create table public.scores (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  game_id text not null,
  score integer not null check (score between 0 and 9999999),
  level integer not null default 1 check (level between 1 and 999),
  created_at timestamptz not null default now()
);

create index scores_game_score_idx on public.scores (game_id, score desc);
create index scores_user_id_idx on public.scores (user_id);

alter table public.scores enable row level security;

create policy "scores_select_public"
  on public.scores
  for select
  using (true);

create policy "scores_insert_own"
  on public.scores
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);
