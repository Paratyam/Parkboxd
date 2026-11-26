# Parkboxd: project plan

A Letterboxd-style website for South Park episodes. It's for me and my friends: they sign up for accounts, log and rate episodes, and interact with each other. This is a fun project, not a learning exercise, so Claude writes the code.

Design mockup (home page and episode page): https://claude.ai/artifact/8AhACzVob6ghrqKV25fx6t
Mockup source files are in `design-mockup/`. They're for reference only, because they need the design canvas's runtime to render; copy the styles out of them.

---

## Decisions made

| Topic | Decision |
|---|---|
| Name | **Parkboxd** (may change later, so keep the name in one config constant) |
| Users | Real accounts: email/password sign-up, public profiles with usernames |
| Backend | **Supabase** (free tier): Postgres + Auth + Row Level Security |
| Frontend | **Plain HTML/CSS/JS, no build step**. Load the Supabase JS client from a CDN as an ES module (`https://esm.sh/@supabase/supabase-js@2` or jsDelivr) |
| Hosting | **GitHub Pages** (public repo `parkboxd`, deploy from `main`). Use relative paths everywhere, since the site is served from `/parkboxd/` |
| Routing | Multiple HTML pages with query params (e.g. `episode.html?id=123`, `profile.html?u=name`). GitHub Pages has no server rewrites |
| Episode data | **TMDB API** (South Park TV id = 2190). A one-time **admin-only import page** fetches all seasons and episodes in the browser using a TMDB key the owner pastes in (never commit it), then upserts into Supabase. Re-run it to add new episodes. Credit TMDB in the footer |
| Secrets | The Supabase URL and anon key go in `js/config.js` (public by design; RLS protects the data). The TMDB key is never stored in the repo |

## Style (see mockup)

- Letterboxd layout: dark slate (`#14181c` page, `#0f1215` header/footer, `#242c34` / `#2a3440` surfaces), episode-card grids, small uppercase section headers with a bottom rule, simple top nav
- South Park feel:
  - Construction-paper cards with jagged `clip-path` edges and a faint diagonal texture (`.paper` class)
  - **Luckiest Guy** (Google Fonts) for headings and the cut-out logo letters; **Inter** for body text
  - The boys' colours as accents: green `#3fb950` (stars, primary buttons), orange `#f2711c` (hearts/likes), blue `#6aa8f0` / `#4a90e2` (links), yellow `#f5c518` (highlights), red `#d63a3a`
  - Snowy mountain SVG silhouette in the home hero
  - Logo: each letter of PARKBOXD on its own coloured paper square with a slight rotation
- Jokey copy, e.g. the logout link says "Screw you guys, I'm logging out"
- Don't draw the actual South Park characters (copyright). Real visuals come from the TMDB episode stills
- Text contrast ≥ 4.5:1; real `<button>`/`<a>`/`<label>`; works at phone width

## Data model (Supabase)

- `profiles` (id → auth.users, username unique, display_name, avatar_color, bio, top4 episode ids, is_admin, created_at)
- `episodes` (id, tmdb_id unique, season, number, title, overview, air_date, still_path, runtime)
- `logs` (id, user_id, episode_id, watched_on, rating 0.5–5 in half steps or null, liked, review text, is_rewatch, created_at)
- `watchlist` (user_id, episode_id, added_at)
- `follows` (follower_id, followee_id)
- `review_likes` (user_id, log_id), `comments` (id, log_id, user_id, body, created_at)
- `lists` (id, user_id, title, description), `list_items` (list_id, episode_id, position, note)
- `tags` (id, name, kind: character/theme), `episode_tags` (episode_id, tag_id)
- `arcs` (id, name), `arc_episodes` (arc_id, episode_id, position)
- Views and functions: episode average rating and rating histogram, per-user stats, season progress, "most divisive" (rating std-dev)
- RLS: everyone (logged in) can read; users can only insert/update/delete their own rows; only admins can write `episodes`, `tags`, `arcs`
- Ship all of this as a single `supabase/setup.sql` the owner pastes into the Supabase SQL editor, including a trigger that creates a profile row on sign-up

## Build order

1. **Foundation:** `setup.sql`, `config.js`, shared header/footer, sign up, log in, log out, pick a username, profile page skeleton, admin import page (TMDB → Supabase)
2. **Core loop:** home page, seasons page and season grid, episode page; log modal (½–5 stars, like, review, watched date, rewatch checkbox); diary; watchlist
3. **Profiles:** stats, season progress bars, Top 4, season rankings by average rating, edit profile
4. **Social:** follow/unfollow, friends' activity feed on home, friends' and community averages and the histogram on episode pages, review likes and comments
5. **Extras:** character/theme tags with filters, multi-part arcs (log a whole arc at once), random episode button (unwatched / your 4★+), "Aired on this day", user lists, "Most divisive" and "Highest rated" pages

After each part: the owner uploads to GitHub, tests, gives feedback, and then we move on.

## Owner setup checklist

- [x] Create a Supabase project and give Claude the Project URL and anon public key (in `js/config.js`)
- [x] Run `supabase/setup.sql` in the Supabase SQL editor
- [ ] Get a TMDB API key (themoviedb.org → Settings → API). Keep it private and paste it into the import page
- [x] Create a public GitHub repo and enable Pages: repo `Paratyam/Parkboxd`, live at https://paratyam.github.io/Parkboxd/ (capital P matters)
- [x] Add the GitHub Pages URL to the Supabase Auth URL settings (Site URL and redirect URLs)
- [x] Sign up on the site, then make the account admin (`paratyam` is admin) (`update profiles set is_admin = true where username = '...'`)
- [ ] Run the episode import

## Status

- Planning and mockup done
- **Part 1 (Foundation): code written, waiting for the owner to test**
  - `supabase/setup.sql`: every table, RLS (column grants stop users from setting `is_admin`), sign-up trigger (takes the username from sign-up metadata, else null), `username_available()` RPC, views `latest_ratings`, `episode_ratings`, `episode_rating_histogram`, `user_stats`, `user_season_averages`, `highest_rated`, `most_divisive` (min 3 ratings), functions `season_progress()`, `friends_episode_rating()`. Safe to re-run
  - A user's rating for an episode = the rating on their most recent log (rewatches don't double-count)
  - Pages: `index.html` (placeholder home), `login.html` (log in / sign up tabs), `username.html` (pick or change username), `profile.html?u=` (header, stats, Top 4 slots, recent diary, season progress), `import.html` (admin only)
  - Shared code: `js/config.js`, `js/supabase.js`, `js/layout.js` (header/footer, auth gate, nav list with `ready` flags), `js/ui.js`, `css/style.css`; page scripts in `js/pages/`
  - Checked locally: home and login render at desktop and phone width. Not yet checked against a real Supabase project
- Next step: owner runs the test checklist, then Part 2 (core loop)
