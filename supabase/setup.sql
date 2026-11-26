-- =====================================================================
-- Parkboxd: database setup
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- Safe to re-run: tables use IF NOT EXISTS, policies/functions/views
-- are dropped and recreated.
-- =====================================================================


-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------

create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  username      text unique check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name  text check (char_length(display_name) <= 40),
  avatar_color  text not null default '#f2711c' check (avatar_color ~ '^#[0-9a-fA-F]{6}$'),
  bio           text check (char_length(bio) <= 500),
  top4          bigint[] not null default '{}' check (cardinality(top4) <= 4),
  is_admin      boolean not null default false,
  created_at    timestamptz not null default now()
);

-- Episodes, specials (season 0) and movies all live here, told apart by kind.
-- Movies have no season or number. TMDB movie and episode ids are separate
-- number spaces, so uniqueness is (tmdb_id, kind).
create table if not exists public.episodes (
  id          bigint generated always as identity primary key,
  kind        text not null default 'episode',
  tmdb_id     bigint not null,
  season      int,
  number      int,
  title       text not null,
  overview    text,
  air_date    date,
  still_path  text,
  runtime     int
);
-- Season tier list: { "S": [5, 7], "A": [10], ... } keyed by tier, values are season numbers.
alter table public.profiles add column if not exists season_tiers jsonb not null default '{}';

-- Upgrades for databases created before specials/movies existed.
alter table public.episodes add column if not exists kind text not null default 'episode';
alter table public.episodes alter column season drop not null, alter column number drop not null;
alter table public.episodes drop constraint if exists episodes_kind_check;
alter table public.episodes add constraint episodes_kind_check check (kind in ('episode', 'special', 'movie'));
alter table public.episodes drop constraint if exists episodes_tmdb_id_key;
alter table public.episodes drop constraint if exists episodes_tmdb_kind_key;
alter table public.episodes add constraint episodes_tmdb_kind_key unique (tmdb_id, kind);
update public.episodes set kind = 'special' where season = 0 and kind = 'episode';
create index if not exists episodes_season_number_idx on public.episodes (season, number);

create table if not exists public.logs (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  episode_id  bigint not null references public.episodes (id) on delete cascade,
  watched_on  date default current_date,
  rating      numeric(2,1) check (rating is null or (rating between 0.5 and 5 and rating * 2 = floor(rating * 2))),
  liked       boolean not null default false,
  review      text check (char_length(review) <= 5000),
  is_rewatch  boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists logs_user_idx on public.logs (user_id, watched_on desc);
create index if not exists logs_episode_idx on public.logs (episode_id);

create table if not exists public.watchlist (
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  episode_id  bigint not null references public.episodes (id) on delete cascade,
  added_at    timestamptz not null default now(),
  primary key (user_id, episode_id)
);

create table if not exists public.follows (
  follower_id  uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  followee_id  uuid not null references public.profiles (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
create index if not exists follows_followee_idx on public.follows (followee_id);

create table if not exists public.review_likes (
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  log_id      bigint not null references public.logs (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, log_id)
);
create index if not exists review_likes_log_idx on public.review_likes (log_id);

create table if not exists public.comments (
  id          bigint generated always as identity primary key,
  log_id      bigint not null references public.logs (id) on delete cascade,
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 2000),
  created_at  timestamptz not null default now()
);
create index if not exists comments_log_idx on public.comments (log_id, created_at);

create table if not exists public.lists (
  id           bigint generated always as identity primary key,
  user_id      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title        text not null check (char_length(title) between 1 and 100),
  description  text check (char_length(description) <= 2000),
  created_at   timestamptz not null default now()
);
create index if not exists lists_user_idx on public.lists (user_id);

create table if not exists public.list_items (
  list_id     bigint not null references public.lists (id) on delete cascade,
  episode_id  bigint not null references public.episodes (id) on delete cascade,
  position    int not null default 0,
  note        text check (char_length(note) <= 1000),
  primary key (list_id, episode_id)
);

create table if not exists public.tags (
  id    bigint generated always as identity primary key,
  name  text not null,
  kind  text not null check (kind in ('character', 'theme')),
  unique (name, kind)
);

create table if not exists public.episode_tags (
  episode_id  bigint not null references public.episodes (id) on delete cascade,
  tag_id      bigint not null references public.tags (id) on delete cascade,
  primary key (episode_id, tag_id)
);
create index if not exists episode_tags_tag_idx on public.episode_tags (tag_id);

create table if not exists public.arcs (
  id    bigint generated always as identity primary key,
  name  text not null unique
);

create table if not exists public.arc_episodes (
  arc_id      bigint not null references public.arcs (id) on delete cascade,
  episode_id  bigint not null references public.episodes (id) on delete cascade,
  position    int not null default 0,
  primary key (arc_id, episode_id)
);


-- ---------------------------------------------------------------------
-- Table privileges
-- Newer Supabase projects don't grant these automatically. RLS (below)
-- still decides which rows each user can actually touch.
-- ---------------------------------------------------------------------

grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to authenticated;
grant insert, update, delete on
  public.logs, public.watchlist, public.follows, public.review_likes, public.comments,
  public.lists, public.list_items,
  public.episodes, public.tags, public.episode_tags, public.arcs, public.arc_episodes
  to authenticated;
grant usage, select on all sequences in schema public to authenticated;


-- ---------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------

-- True when the logged-in user is an admin.
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- Lets the sign-up form check a username before an account exists.
create or replace function public.username_available(p_username text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select lower(p_username) ~ '^[a-z0-9_]{3,20}$'
     and not exists (select 1 from public.profiles where username = lower(p_username));
$$;
grant execute on function public.username_available(text) to anon, authenticated;


-- ---------------------------------------------------------------------
-- New user → profile row
-- The sign-up form passes the wanted username in user metadata.
-- If it's missing, invalid or taken, the profile starts with no
-- username and the site sends the user to the "pick a username" page.
-- ---------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  wanted text := lower(nullif(trim(new.raw_user_meta_data ->> 'username'), ''));
  colour text := (array['#3fb950', '#4a90e2', '#d63a3a', '#f5c518', '#f2711c'])[1 + floor(random() * 5)::int];
begin
  if wanted is null
     or wanted !~ '^[a-z0-9_]{3,20}$'
     or exists (select 1 from public.profiles where username = wanted) then
    wanted := null;
  end if;

  begin
    insert into public.profiles (id, username, avatar_color) values (new.id, wanted, colour);
  exception when unique_violation then
    insert into public.profiles (id, avatar_color) values (new.id, colour) on conflict (id) do nothing;
  end;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Profiles for any accounts that existed before this script ran.
insert into public.profiles (id) select id from auth.users on conflict (id) do nothing;


-- ---------------------------------------------------------------------
-- Row Level Security
-- Logged-in users can read everything. Users write only their own rows.
-- Only admins write episodes, tags and arcs.
-- ---------------------------------------------------------------------

alter table public.profiles      enable row level security;
alter table public.episodes      enable row level security;
alter table public.logs          enable row level security;
alter table public.watchlist     enable row level security;
alter table public.follows       enable row level security;
alter table public.review_likes  enable row level security;
alter table public.comments      enable row level security;
alter table public.lists         enable row level security;
alter table public.list_items    enable row level security;
alter table public.tags          enable row level security;
alter table public.episode_tags  enable row level security;
alter table public.arcs          enable row level security;
alter table public.arc_episodes  enable row level security;

-- Drop every existing policy on these tables so re-runs start clean.
do $$
declare p record;
begin
  for p in
    select policyname, tablename from pg_policies
    where schemaname = 'public'
      and tablename in ('profiles','episodes','logs','watchlist','follows','review_likes',
                        'comments','lists','list_items','tags','episode_tags','arcs','arc_episodes')
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

-- Read access for every table
create policy "read" on public.profiles     for select to authenticated using (true);
create policy "read" on public.episodes     for select to authenticated using (true);
create policy "read" on public.logs         for select to authenticated using (true);
create policy "read" on public.watchlist    for select to authenticated using (true);
create policy "read" on public.follows      for select to authenticated using (true);
create policy "read" on public.review_likes for select to authenticated using (true);
create policy "read" on public.comments     for select to authenticated using (true);
create policy "read" on public.lists        for select to authenticated using (true);
create policy "read" on public.list_items   for select to authenticated using (true);
create policy "read" on public.tags         for select to authenticated using (true);
create policy "read" on public.episode_tags for select to authenticated using (true);
create policy "read" on public.arcs         for select to authenticated using (true);
create policy "read" on public.arc_episodes for select to authenticated using (true);

-- Profiles: rows are created by the trigger; users update only their own,
-- and only the columns granted below (so nobody can make themselves admin).
create policy "update own" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (username, display_name, avatar_color, bio, top4, season_tiers) on public.profiles to authenticated;

-- Own-row tables
create policy "insert own" on public.logs for insert to authenticated with check (user_id = (select auth.uid()));
create policy "update own" on public.logs for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "delete own" on public.logs for delete to authenticated using (user_id = (select auth.uid()));

create policy "insert own" on public.watchlist for insert to authenticated with check (user_id = (select auth.uid()));
create policy "delete own" on public.watchlist for delete to authenticated using (user_id = (select auth.uid()));

create policy "insert own" on public.follows for insert to authenticated with check (follower_id = (select auth.uid()));
create policy "delete own" on public.follows for delete to authenticated using (follower_id = (select auth.uid()));

create policy "insert own" on public.review_likes for insert to authenticated with check (user_id = (select auth.uid()));
create policy "delete own" on public.review_likes for delete to authenticated using (user_id = (select auth.uid()));

create policy "insert own" on public.comments for insert to authenticated with check (user_id = (select auth.uid()));
create policy "update own" on public.comments for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
-- Authors can delete their comments; review owners can delete comments on their review.
create policy "delete own or on own review" on public.comments for delete to authenticated using (
  user_id = (select auth.uid())
  or exists (select 1 from public.logs l where l.id = log_id and l.user_id = (select auth.uid()))
);

create policy "insert own" on public.lists for insert to authenticated with check (user_id = (select auth.uid()));
create policy "update own" on public.lists for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "delete own" on public.lists for delete to authenticated using (user_id = (select auth.uid()));

create policy "write own list" on public.list_items for all to authenticated
  using (exists (select 1 from public.lists l where l.id = list_id and l.user_id = (select auth.uid())))
  with check (exists (select 1 from public.lists l where l.id = list_id and l.user_id = (select auth.uid())));

-- Admin-only tables
create policy "admin write" on public.episodes     for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin write" on public.tags         for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin write" on public.episode_tags for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin write" on public.arcs         for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin write" on public.arc_episodes for all to authenticated using (public.is_admin()) with check (public.is_admin());


-- ---------------------------------------------------------------------
-- Rating views and functions
-- Views use security_invoker so the caller's RLS applies.
-- A user's rating for an episode = the rating on their most recent log.
-- ---------------------------------------------------------------------

drop view if exists public.most_divisive;
drop view if exists public.highest_rated;
drop view if exists public.user_season_averages;
drop view if exists public.user_stats;
drop view if exists public.episode_rating_histogram;
drop view if exists public.episode_ratings;
drop view if exists public.latest_ratings;

create view public.latest_ratings with (security_invoker = on) as
select distinct on (user_id, episode_id)
  user_id, episode_id, rating
from public.logs
where rating is not null
order by user_id, episode_id, watched_on desc nulls last, created_at desc;

-- Community numbers per episode
create view public.episode_ratings with (security_invoker = on) as
select
  e.id                            as episode_id,
  coalesce(l.log_count, 0)        as log_count,
  coalesce(l.watcher_count, 0)    as watcher_count,
  coalesce(l.like_count, 0)       as like_count,
  coalesce(l.review_count, 0)     as review_count,
  coalesce(r.rating_count, 0)     as rating_count,
  r.avg_rating,
  r.rating_stddev
from public.episodes e
left join (
  select episode_id,
         count(*)::int                                                  as log_count,
         count(distinct user_id)::int                                   as watcher_count,
         count(distinct user_id) filter (where liked)::int              as like_count,
         count(*) filter (where coalesce(trim(review), '') <> '')::int  as review_count
  from public.logs group by episode_id
) l on l.episode_id = e.id
left join (
  select episode_id,
         count(*)::int                    as rating_count,
         round(avg(rating), 2)            as avg_rating,
         round(stddev_pop(rating), 3)     as rating_stddev
  from public.latest_ratings group by episode_id
) r on r.episode_id = e.id;

-- Histogram buckets (0.5 … 5). Buckets with no ratings are missing; the page fills zeros.
create view public.episode_rating_histogram with (security_invoker = on) as
select episode_id, rating, count(*)::int as count
from public.latest_ratings
group by episode_id, rating;

-- Per-user totals for profile pages
create view public.user_stats with (security_invoker = on) as
select
  p.id                                                                         as user_id,
  p.username,
  count(distinct l.episode_id)::int                                            as episodes_watched,
  count(l.id)::int                                                             as log_count,
  count(l.id) filter (where date_part('year', l.watched_on) = date_part('year', current_date))::int as logs_this_year,
  count(l.id) filter (where coalesce(trim(l.review), '') <> '')::int           as review_count,
  count(distinct l.episode_id) filter (where l.liked)::int                     as like_count,
  coalesce(sum(e.runtime), 0)::int                                             as minutes_watched,
  (select round(avg(lr.rating), 2) from public.latest_ratings lr where lr.user_id = p.id) as avg_rating,
  (select count(*)::int from public.follows f where f.followee_id = p.id)      as followers,
  (select count(*)::int from public.follows f where f.follower_id = p.id)      as following,
  (select count(*)::int from public.lists li where li.user_id = p.id)          as list_count
from public.profiles p
left join public.logs l on l.user_id = p.id
left join public.episodes e on e.id = l.episode_id
group by p.id;

-- Each user's average rating per season (season rankings)
create view public.user_season_averages with (security_invoker = on) as
select lr.user_id, e.season, round(avg(lr.rating), 2) as avg_rating, count(*)::int as rated_count
from public.latest_ratings lr
join public.episodes e on e.id = lr.episode_id
group by lr.user_id, e.season;

-- Rankings (need at least 3 ratings to qualify)
create view public.highest_rated with (security_invoker = on) as
select r.*, e.kind, e.season, e.number, e.title, e.still_path
from public.episode_ratings r join public.episodes e on e.id = r.episode_id
where r.rating_count >= 3
order by r.avg_rating desc, r.rating_count desc;

create view public.most_divisive with (security_invoker = on) as
select r.*, e.kind, e.season, e.number, e.title, e.still_path
from public.episode_ratings r join public.episodes e on e.id = r.episode_id
where r.rating_count >= 3
order by r.rating_stddev desc, r.rating_count desc;

-- Season progress for one user (defaults to the caller). Skips specials (season 0).
create or replace function public.season_progress(p_user uuid default auth.uid())
returns table (season int, watched int, total int)
language sql stable security invoker set search_path = public
as $$
  select e.season,
         count(distinct e.id) filter (where l.user_id is not null)::int,
         count(distinct e.id)::int
  from public.episodes e
  left join public.logs l on l.episode_id = e.id and l.user_id = p_user
  where e.season > 0
  group by e.season
  order by e.season;
$$;

-- Average of the latest ratings from people the caller follows
create or replace function public.friends_episode_rating(p_episode bigint)
returns table (avg_rating numeric, rating_count int)
language sql stable security invoker set search_path = public
as $$
  select round(avg(lr.rating), 2), count(*)::int
  from public.latest_ratings lr
  join public.follows f on f.followee_id = lr.user_id and f.follower_id = auth.uid()
  where lr.episode_id = p_episode;
$$;

-- Episodes (incl. specials/movies) first released on a given month/day
create or replace function public.aired_on_this_day(p_month int, p_day int)
returns setof public.episodes
language sql stable security invoker set search_path = public
as $$
  select * from public.episodes
  where extract(month from air_date) = p_month and extract(day from air_date) = p_day
  order by air_date;
$$;

-- Most-logged episodes over the last p_days days
create or replace function public.popular_episodes(p_days int default 7, p_limit int default 12)
returns table (episode_id bigint, log_count int, watcher_count int, avg_rating numeric)
language sql stable security invoker set search_path = public
as $$
  select l.episode_id, count(*)::int, count(distinct l.user_id)::int, round(avg(l.rating), 2)
  from public.logs l
  where l.created_at > now() - make_interval(days => p_days)
  group by l.episode_id
  order by 3 desc, 2 desc
  limit p_limit;
$$;

-- Same, but only counting people the caller follows
create or replace function public.popular_with_friends(p_days int default 7, p_limit int default 12)
returns table (episode_id bigint, log_count int, watcher_count int, avg_rating numeric)
language sql stable security invoker set search_path = public
as $$
  select l.episode_id, count(*)::int, count(distinct l.user_id)::int, round(avg(l.rating), 2)
  from public.logs l
  join public.follows f on f.followee_id = l.user_id and f.follower_id = auth.uid()
  where l.created_at > now() - make_interval(days => p_days)
  group by l.episode_id
  order by 3 desc, 2 desc
  limit p_limit;
$$;

grant execute on function public.aired_on_this_day(int, int), public.popular_episodes(int, int),
  public.popular_with_friends(int, int) to authenticated;

grant select on public.latest_ratings, public.episode_ratings, public.episode_rating_histogram,
  public.user_stats, public.user_season_averages, public.highest_rated, public.most_divisive
  to authenticated;
grant execute on function public.season_progress(uuid), public.friends_episode_rating(bigint), public.is_admin()
  to authenticated;
