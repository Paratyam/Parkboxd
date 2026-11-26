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
- `episodes` (id, kind: episode/special/movie, tmdb_id, season, number, title, overview, air_date, still_path, runtime; unique (tmdb_id, kind)). Specials are TMDB season 0; movies have null season/number and come from a TMDB movie search the admin picks from on the import page
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
- Part 1 tested and live. Fixes along the way: explicit table grants (new Supabase projects don't grant them), `episodes.kind` for specials/movies. DB has 337 episodes, 32 specials, 8 movies (non-South Park search hits deleted)
- **Part 2 (Core loop): code written and live, waiting for the owner to test**
  - New SQL functions `aired_on_this_day(month, day)` and `popular_episodes(days, limit)` (already applied to the live DB)
  - Pages: `episode.html?id=` (still hero, Watch/Like/Watchlist toggles, half-star rating, rating histogram + average, everyone's reviews, prev/next), `seasons.html` (season covers with progress) and `seasons.html?s=5|specials|movies`, `episodes.html` (search, filters, sort; header search lands here), `diary.html?u=` (grouped by month, edit/delete own), `watchlist.html?u=`
  - Home (logged in): aired on this day, popular this week (falls back to latest episodes), recent reviews, your progress, random unwatched / 4★+ buttons
  - Log dialog (`js/log-modal.js`) from the header "+ Log", episode pages and diary edit: date or "don't remember", ½–5 stars, like, review, rewatch. Logging removes the episode from your watchlist
  - Quick Watch/Like/Rate on an episode page with no log yet creates an undated log. Un-watching deletes all your logs for it (with a confirm)
  - Reviews and "popular" show everyone for now; Part 4 switches them to friends
  - Shared code: `js/episodes.js` (cards, loaders, `myLogMap`), `js/stars.js`; profile pages have Profile / Diary / Watchlist / Ratings tabs
  - Letterboxd-style ratings chart (`js/histogram.js`) on profiles; each bar links to `ratings.html?u=&r=4` listing that user's episodes at that rating
- **Part 3 (Profiles): code written and live, waiting for the owner to test**
  - `settings.html`: display name, bio, avatar colour (8 swatches), link to change username, Top 4 picker (search, reorder, remove). `settings.html#top4` jumps to the picker
  - `stats.html?u=`: tiles (watched, hours, logs this year, avg rating, reviews, liked, rewatches, specials & movies), season rankings by average rating (from `user_season_averages`), logs per month for the last 12 months, progress for every season + specials + movies, most rewatched
  - Profile: Edit profile button, Hours stat, Top 4 shows real cards (empty slots link to the picker), season progress links to stats. Tabs: Profile / Diary / Watchlist / Ratings / Stats
  - Episode page: "Add to your Top 4" / remove link in the action panel
  - Charts stay single-colour green (no rainbow bars), with hover labels
- **Part 4 (Social): code written and live, waiting for the owner to test**
  - New SQL function `popular_with_friends(days, limit)` (applied to the live DB)
  - `friends.html?u=&tab=following|followers|everyone`: follow/unfollow buttons; "Find people" lists every user (it's a small friend group). Nav "Friends" now live
  - Profiles: Follow/Following button; Followers/Following stats link to the lists
  - `review.html?id=`: full review, who liked it, comments (post; delete your own, or any on your own review)
  - Reviews everywhere (`js/social.js` `reviewHTML`): "Friend" tag, ♡ Like review (not on your own), likes · comments link
  - Episode page: Friends' average next to everyone's; "Your review" box above everyone else's (edit it, or "Write a review" adds one to your existing log), then friends' reviews first
  - `reviews.html?u=` (profile tab "Reviews"): every review a user wrote, sort by newest / highest / lowest / most liked; profile shows the 3 most recent, and the Reviews stat links there
  - Home: "Popular with friends this week" (falls back to everyone, then latest episodes), "Recent reviews from friends", Friends' activity feed (latest 12 logs from people you follow)
  - Progress bars are all green now
- Part 4 checked by owner: following stays one-way (follower system, like Letterboxd)
- **Part 5 (Extras): code written and live, waiting for the owner to test**. No DB changes needed
  - Lists: `lists.html` (everyone's / mine, create), `list.html?id=` (view; owner edits title, description, adds via search, reorders, notes, removes, deletes). "Add to a list…" dialog on episode pages (`js/lists.js`)
  - Arcs: `arc.html?id=`, "Log the whole arc" dialog (`js/arcs.js`: one date, optional shared rating/like, skips parts already logged), arc box on episode pages, "Multi-part arcs" section on `seasons.html#arcs`
  - Tags: chips on episode pages (link to `episodes.html?tag=`), admins add/remove right there (new tag names pick character/theme), tag filter on Episodes
  - `admin.html` (header "Admin" link): tag list (rename, delete, "Add starter tags" = ~50 common character/theme names, no episodes attached), arcs (create, edit parts, delete), "Suggested arcs" matched by title with a preview before adding. Import stays at `import.html`
  - `rankings.html`: Highest rated and Most divisive (std-dev), adjustable minimum ratings (default 3), computed from `episode_ratings`
  - Random episode and "Aired on this day" were already done in Part 2
- After Part 5:
  - Character focus tags: `js/data/character-tags.js` (185 hand-picked episodes → main character), applied from the Admin page; "Episodes about" quick filter on Episodes. TMDB titles differ for a few (e.g. "Cartoon Wars (1)", "Go God Go XII (2)", "The Simpsons Already Did It")
  - Random episode picker (`js/random.js`): 🎲 in the header, home hero and sidebar. Pick from unwatched / rated (with a minimum) / anything, episodes/specials/movies, one season; "Roll again" on the episode it lands on. Settings remembered in localStorage
  - Jokes (`js/jokes.js`): rating reactions as toasts based on character tags (e.g. Kenny episode rated 1★), show-style empty states, loading lines, confirms and errors. All copy lives in that one file
- Fun batch (live, waiting for the owner to test):
  - Forgot password: link on the log-in form → `resetPasswordForEmail` → `reset.html` sets the new password. Uses Supabase's built-in email (rate-limited on the free tier)
  - Shared maths in `js/insights.js`: everyone's latest ratings, episode averages, character tags
  - Taste match on other people's profiles (agreement % from shared ratings, "Biggest fight"), full list at `compare.html?u=`
  - Hot takes: a rating 2★+ from the episode average (episodes with 3+ ratings). 🌶️ tag on reviews; `hottakes.html` (tab on Rankings) lists the hottest takes and spiciest people
  - Badges (14 incl. 🦝 Coon & Friends for the Coon saga; ❓ Mysterion (every Kenny episode) and 😈 Professor Chaos (every Butters episode) reveal their secret mode on your own profile, with a one-time pop-up; computed in the browser, no DB): shown on profiles with progress bars
  - South Park personality on profiles (replaced "Which character are you?"): Butters (75%+ at 4★+), Jimmy (65–75%, lowest priority like Stan), Cartman (2★ or less, 2½★ counts half, 18%+; just below Randy in priority), Randy (spread 1.0+, 12%+ at each end, more love than hate), Mr. Mackey, Kyle (200+ character reviews), Kenny (35+ logs, under 3% reviewed), Towelie (22%+ rewatches), Stan as fallback; tuned against a 1,500-user simulation; `PERSONALITY_OVERRIDES` in js/insights.js pins paratyam to Butters
  - Season tier list `tiers.html?u=` (Tiers tab): drag, or tap a season then a tier; saved in new column `profiles.season_tiers` (jsonb, applied to the live DB)
  - Butters' Book Club `club.html` (nav "Book Club" + home card): the same pick for everyone, worked out from the week number (Monday UTC), with this week's watchers and reviews and the previous 4 picks. Butters posts an automatic review at the top every week (`js/butters.js`: seeded template lines in his voice, always 4½ or 5 stars, extra line if a character tag matches). Everyone can like it (`butters_likes` table, one row per user per week), and Butters reacts with a toast
  - Episode page banners now load w1280 stills instead of the 4K original
- Ideas not built yet: upcoming (unaired) episodes section, notifications, year in review
- Butters pack (live):
  - GROUNDED stamp on profiles for 24h after rating a Butters-tagged episode 2★ or less (from the log's `created_at`, so re-rating an old log doesn't trigger it), plus a matching reaction line
  - Secret modes (`js/fx.js`, one at a time, remembered in localStorage `parkboxd-mode`): Professor Chaos (type "chaos" or tap the logo 5 times; green + tinfoil, logo CHAOS) and Mysterion (type "mysterion" or hold the logo; dark purple, big green ?, logo MYSTERION). Keys are read by physical position so any keyboard language works
  - 🍔 Hamburger rain on a 5★ rating of a Butters episode (skipped with reduced motion)
  - Favourite character (`profiles.favourite_character`, applied to the live DB): picker in Edit profile, "Team …" flair on profiles, reactions take their side
- Notifications (live): `notifications` table filled by triggers on follows, review likes and comments (never for your own actions; re-likes/re-follows don't duplicate). 🔔 bell in the header with an unread count; `notifications.html` lists them, marks them read on view, "Clear all"
- Team flair colours: `CHARACTER_COLOURS` in js/data/character-tags.js (Kenny orange, Butters yellow, Kyle green, Cartman red, Stan blue, …), preview in Edit profile
- Coon takeover (`js/fx.js`): about 1 page load in 150 (or `?coon=1` on any page) a raccoon-striped banner says the site is "property of The Coon"; it follows you to every page (sessionStorage) until "Fine, whatever" is clicked
- Hero/villain extras: Mysterion mode masks everyone else's avatar (?) and blurs their names until hovered; Chaos mode turns the 🎲 into 😈 "Unleash chaos" (random pick from your lowest-rated episodes) and gives every rating a villain reaction; the Coon takeover renames Friends to "Coon & Friends" and puts a fake "The Coon (2009)" at #1 on Rankings; `franchise.html` is The Coon's franchise plan (linked from the takeover banner)
- Badge flair (`js/flair.js`, logged-in pages, cached 10 min per tab): 🏔️ Completionist = gold ring around your avatar everywhere, ✍️ Critic (25+ reviews) = "Critic" tag after your name, 🌶️ Hot Take Artist (5+ hot takes) = 🌶️ after your name. Applied to anything rendered on the page (MutationObserver)
- Coon & Friends badge reward (`js/coon-member.js`): during a takeover members get "Welcome back, <name>. Member of Coon & Friends." and appear as #2 "Official Sidekick" on the rigged Rankings; the franchise plan adds "Phase 8: <name>'s spin-off"
- 🔁 Same Old Story badge holders (10+ rewatch logs) get a 🧻 drifting across the screen and "Don't forget to bring a towel!" whenever they log a rewatch (log dialog or log-whole-arc)
- `BADGE_GRANTS` in js/insights.js hands out badges by username (paratyam has 📅 Day One)

### Cage Match (personal)
- `cage.html?u=` (profile tab "Cage Match"): on your own page, pick the better of two episodes you've watched (click, or ← → keys, ↓ to skip; undo; reset). Cartman comments on every pick
- Votes are stored in `cage_votes`; scores are Elo worked out in the browser (`js/cage.js`), starting from your star rating so the ranking begins sensibly. Pairs favour episodes with few fights and similar scores, and avoid recent repeats
- Ranking list with W–L record per episode (🔥 unbeaten after 3+ wins); other people's pages show their ranking only
- Profile: "Cage Match champion" spot under Favourite episodes (🏆 Undefeated champion if #1 never lost and has 3+ wins); a prompt to play if you have none yet

### Report card and streak
- Mr. Garrison's Report Card (Stats tab, `js/report-card.js`): a season gets a letter grade once 40% of its aired episodes are rated (min 3, or all of a shorter season); scale A+ 4.2, A 4.0, A- 3.8, B+ 3.6, B 3.4, B- 3.2, C+ 3.0, C 2.8, C- 2.6, D 2.2. "On a curve" toggle (default on, remembered) grades each season against your own average (your average season = B+). Each season names its ⭐ class star and 🙄 troublemaker (best and worst rated episode). 📸 Save as image (html-to-image from esm.sh; shares on phones, downloads elsewhere), otherwise INC (incomplete) with how many more it needs; seasons with nothing rated show as ABS (absent), so every aired season is on the card. Grade (A+ to F) from the average rating, attendance (watched / total), and a Garrison comment; class GPA, valedictorian, most likely to repeat a grade, and a note about the student (generous, harsh, perfect attendance…)
- Tegridy streak (`js/streak.js`): days in a row you logged something (the day you logged it, not the watch date, so back-dating or imports can't fake a streak). Current + longest, Randy reacts (day one, a week, at risk "log today", broke a 3+ day streak in the last week). Shown on Stats, as a profile stat tile, and on the home page
- Cage Match upgrades: "Fight within" picker (everything, 🏆 finals = your current top 10, only 4★+, a single season, specials & movies; remembered), "Ranking settled" meter (share with 3+ fights) and picks this visit, ▲▼ movement since the visit started, NEW CHAMPION (burger rain) and UPSET calls, undo brings the same fight back (Backspace), ranking shows top 50 with "Show all". Keys only work while the arena is on screen. Episode pages show your Cage Match spot and record
- Fixed: double undo / undo during a pick could drop a pick locally that was still saved; ↓ hijacked page scrolling
- Cartman hosts the Cage Match (`js/cage-host.js`): chain-link cage arena with hazard stripe and spotlight, "Cartman's Cage Match" banner and round counter, Cartman's comic speech bubble (pops on every line) with a reaction to the last fight plus a hype intro for the next (champion defending, clash of 5★ titans, mismatch, garbage fight, debut). Red / blue / 👑 champion corners, WINNER! and K.O. stamps on every pick, calls for new champion (burger rain), title defence, upset, 3+ win streak, stomp, close fight, debut; crowd reactions. Reduced motion turns the animations off
- Cage Match moved to the main nav (after Book Club); the profile tab is now "Rankings" (`cage.html?u=&view=ranking`, ranking list only, no game). Home shows a Cage Match ad next to the Book Club card, with your champion if you have one
- Book Club redesign (school library / notebook theme): home card on lined notebook paper with washi tape, hole punches and a gold "Butters' pick" sticker; club page hero notebook page with a library "Due back in N days" stamp, the pick as a book cover with spine and "This week's book" ribbon, an index-card info panel ("Checked out this week" members), Butters' review as a lined-paper note with a gold star, and "Past reads" on a wooden shelf
- Book Club voting (`club_votes`, `js/club.js` `loadPicks`): Butters suggests 3 episodes for next week (his first suggestion is the old date-based pick); members vote (one vote each, change or take back); most votes wins, ties and no votes go to Butters' first suggestion, so past weeks keep their book. Past reads show the club's average rating and how many members read it that week
- Profile: 📚 Library card (last 10 picks, a red READ stamp for each one read during its week, "Read N of the last 10"). New badges: 📚 Bookworm (read 5 picks during their week) and 🥊 Ringmaster (judge 100 Cage Match fights)
