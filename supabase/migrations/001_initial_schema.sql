-- MANUAL STEP: Apply this migration in Supabase Dashboard → SQL Editor
-- Also create Storage bucket: Name="round-music", Public=ON

-- supabase/migrations/001_initial_schema.sql

-- Enums
create type game_status as enum ('waiting', 'in_progress', 'paused', 'finished');
create type round_status as enum ('pending', 'active', 'completed');
create type difficulty_level as enum ('easy', 'medium', 'hard');
create type player_role as enum ('paladin', 'warrior', 'archer', 'thief', 'bard');
create type item_type as enum ('clock', 'heart', 'chest');

-- Games
create table games (
  id            uuid primary key default gen_random_uuid(),
  status        game_status not null default 'waiting',
  total_rounds  integer not null,
  team_score    integer not null default 0,
  created_at    timestamptz not null default now()
);

-- Rounds
create table rounds (
  id            uuid primary key default gen_random_uuid(),
  game_id       uuid not null references games(id) on delete cascade,
  round_number  integer not null,
  status        round_status not null default 'pending',
  music_url     text,
  music_name    varchar(100),
  unique(game_id, round_number)
);

-- Questions
create table questions (
  id             uuid primary key default gen_random_uuid(),
  round_id       uuid not null references rounds(id) on delete cascade,
  body           text not null,
  difficulty     difficulty_level not null,
  points_correct integer not null,
  points_wrong   integer not null,
  time_limit     integer not null default 30,
  "order"        integer not null default 0
);

-- Question options
create table question_options (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions(id) on delete cascade,
  body        text not null,
  is_correct  boolean not null default false
);

-- Players
create table players (
  id            uuid primary key default gen_random_uuid(),
  game_id       uuid not null references games(id) on delete cascade,
  nickname      varchar(32) not null,
  role          player_role not null,
  ability_uses  integer not null default 1,
  joined_at     timestamptz not null default now(),
  unique(game_id, role)
);

-- Game items (shared inventory)
create table game_items (
  id          uuid primary key default gen_random_uuid(),
  game_id     uuid not null references games(id) on delete cascade,
  type        item_type not null,
  is_used     boolean not null default false,
  obtained_at timestamptz not null default now()
);

-- RLS: disable for now (internal app, single session)
alter table games disable row level security;
alter table rounds disable row level security;
alter table questions disable row level security;
alter table question_options disable row level security;
alter table players disable row level security;
alter table game_items disable row level security;
