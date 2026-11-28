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
- [x] Create a public GitHub repo and enable Pages: repo `Paratyam/Parkboxd`, live at https://paratyam.github.io/Parkboxd/ (capital P matters). Main address is now https://parkboxd.pages.dev (Cloudflare Pages project `parkboxd`); both deploy from `main`, and Supabase Auth must allow both
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
  - Pages: `episode.html?id=` (still hero, Watch/Like/Watchlist toggles, half-star rating, rating histogram + average, everyone's reviews, prev/next), `seasons.html` (season covers with progress) and `seasons.html?s=5|specials|movies`, `episodes.html` (search, filters, sort; header search lands here; "S15" or "season 15" shows the whole season, "S15E3" one episode, both in the header dropdown too via `seasonCode()` in js/episodes.js), `diary.html?u=` (grouped by month, edit/delete own), `watchlist.html?u=`
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
  - Random episode (`js/random.js`): 🎲 in the header, home hero and sidebar open the Chef's menu. The home page's quick rolls (unwatched / rewatch a 4★+) jump straight to an episode with "Roll again"
  - Chef's menu (`js/chef.js`): the picker, with ten dishes (Cartman / Butters / Randy episodes, Fan favorite, Hidden gem, Leftovers = watchlist, Spicy, Today's special, Mystery meat = anything, Seconds, please = your 4★+), an "Only ones I haven't seen" box, a lid-lifting plate, "Watch it" / "Send it back". Hidden gem = the least-rated third of episodes averaging 4★+ (2+ ratings), compared with each other
  - Jokes (`js/jokes.js`): rating reactions as toasts based on character tags (e.g. Kenny episode rated 1★), show-style empty states, loading lines, confirms and errors. All copy lives in that one file
- Fun batch (live, waiting for the owner to test):
  - Forgot password: link on the log-in form → `resetPasswordForEmail` → `reset.html` sets the new password. Uses Supabase's built-in email (rate-limited on the free tier)
  - Shared maths in `js/insights.js`: everyone's latest ratings, episode averages, character tags
  - Taste match on other people's profiles (agreement % from shared ratings, "Biggest fight"), full list at `compare.html?u=`
  - Hot takes: a rating 2★+ from the episode average (episodes with 3+ ratings). 🌶️ tag on reviews; `hottakes.html` (tab on Rankings) lists the hottest takes and spiciest people
  - Badges (14 incl. 🦝 Coon & Friends for the Coon saga; ❓ Mysterion (every Kenny episode) and 😈 Professor Chaos (every Butters episode) reveal their secret mode on your own profile, with a one-time pop-up; computed in the browser, no DB): shown on profiles with progress bars
  - South Park personality on profiles (replaced "Which character are you?"): Butters (75%+ at 4★+), Jimmy (65–75%, lowest priority like Stan), Cartman (2★ or less, 2½★ counts half, 18%+; just below Randy in priority), Randy (spread 1.0+, 12%+ at each end, more love than hate), Mr. Mackey, Kyle (200+ character reviews), Kenny (35+ logs, under 3% reviewed), Towelie (22%+ rewatches), Stan as fallback; tuned against a 1,500-user simulation; `PERSONALITY_OVERRIDES` in js/insights.js pins paratyam to Butters and itai to Kenny
  - Season tier list `tiers.html?u=` (Tiers tab): drag, or tap a season then a tier; saved in new column `profiles.season_tiers` (jsonb, applied to the live DB)
  - Butters' Book Club `club.html` (nav "Book Club" + home card): the same pick for everyone, worked out from the week number (Monday UTC), with this week's watchers and reviews and the previous 4 picks. Butters posts an automatic review at the top every week (`js/butters.js`: seeded template lines in his voice, always 4½ or 5 stars, plus his own line about that episode from `js/data/butters-notes.js`, keyed by season.number; the character-tag line is only a fallback, so add a line when new episodes air). Everyone can like it (`butters_likes` table, one row per user per week), and Butters reacts with a toast
  - Episode page banners now load w1280 stills instead of the 4K original
- Ideas not built yet: upcoming (unaired) episodes section, notifications, year in review
- Butters pack (live):
  - GROUNDED stamp on profiles for 24h after rating a Butters-tagged episode 2★ or less (from the log's `created_at`, so re-rating an old log doesn't trigger it), plus a matching reaction line
  - Secret modes (`js/fx.js`, one at a time, remembered in localStorage `parkboxd-mode`): Professor Chaos (type "chaos" or tap the logo 5 times; green + tinfoil, logo CHAOS) and Mysterion (type "mysterion" or hold the logo; dark purple, big green ?, logo MYSTERION). Keys are read by physical position so any keyboard language works
  - 🍔 Hamburger rain on a 5★ rating of a Butters episode (skipped with reduced motion)
  - Favourite character (`profiles.favourite_character`, applied to the live DB): picker in Edit profile, "Team …" flair on profiles, reactions take their side
- Notifications (live): `notifications` table filled by triggers on follows, review likes and comments (never for your own actions; re-likes/re-follows don't duplicate). 🔔 bell in the header with an unread count; `notifications.html` lists them, marks them read on view, "Clear all"
- Team flair colours: `CHARACTER_COLOURS` in js/data/character-tags.js (Kenny orange, Butters yellow, Kyle green, Cartman red, Stan blue, …), preview in Edit profile
- Mode extras: Chaos puts a tinfoil hat on your own avatar; during a Coon takeover rating stars show as raccoons (looks only) and every random roll lands on the Coon saga (`js/random.js`)
- Mr. Mackey counselor notes (`js/mackey.js`): a short note on the episode page of the more intense episodes
- Mr. Hankey's 12 Days of Christmas (`hankey.html`): a holiday episode behind a new door each day, Dec 13 to 24, with a certificate for watching all 12; nav link only in December
- Add to home screen: `manifest.webmanifest`, icons from `tools/make-icons.ps1`, footer button and a closable corner ad on the home page (`js/install.js`); new pages need the manifest/icon tags too. No service worker
- Share cards (`js/share.js`): "Share review" on your own reviews and "Share my Top 4" on your profile draw a paper-cutout image on a canvas (original art, no stills) with the site link; preview, download or share. Both cards show TMDB episode stills (owner's choice, an exception to the original-art rule)
- Sharing extras: link preview picture `og.png` (`tools/make-preview.ps1`, tags in every HTML head), "Can you beat me?" mystery text, share cards for your badges and personality, and invite links (`js/invite.js`: `?invite=username`, new accounts auto-follow)
- Coon takeover (`js/fx.js`): about 1 page load in 150 (or `?coon=1` on any page) a raccoon-striped banner says the site is "property of The Coon"; it follows you to every page (sessionStorage) until "Fine, whatever" is clicked
- Hero/villain extras: Mysterion mode masks everyone else's avatar (?) and blurs their names until hovered; Chaos mode turns the 🎲 into 😈 "Unleash chaos" (random pick from your lowest-rated episodes) and gives every rating a villain reaction; the Coon takeover renames Friends to "Coon & Friends" and puts a fake "The Coon (2009)" at #1 on Rankings; `franchise.html` is The Coon's franchise plan (linked from the takeover banner)
- Badge rank: 5 / 10 / 15 badges = bronze / silver / gold ring around your avatar (`RANKS` in `js/badges.js`; profile badges header shows progress)
- Every badge unlocks its own profile picture (`badge:` entries in `js/avatars.js`; locked in the settings picker, shown on each badge card; browser-only check, no DB)
- Badge flair (`js/flair.js`, logged-in pages, cached 10 min per tab): 🏔️ Completionist = a crown on your avatar everywhere, ✍️ Critic (25+ reviews) = "Critic" tag after your name, 🌶️ Hot Take Artist (5+ hot takes) = 🌶️ after your name. Applied to anything rendered on the page (MutationObserver)
- Coon & Friends badge reward (`js/coon-member.js`): during a takeover members get "Welcome back, <name>. Member of Coon & Friends." and appear as #2 "Official Sidekick" on the rigged Rankings; the franchise plan adds "Phase 8: <name>'s spin-off"
- 🔁 Same Old Story badge holders (10+ rewatch logs) get a 🧻 drifting across the screen and "Don't forget to bring a towel!" whenever they log a rewatch (log dialog or log-whole-arc)
- `BADGE_GRANTS` in js/insights.js hands out badges by username (paratyam has 📅 Day One)

### Cage Match (personal)
- `cage.html?u=` (profile tab "Cage Match"): on your own page, pick the better of two episodes you've watched (click, or ← → keys, ↓ to skip; undo; reset). Cartman comments on every pick
- Votes are stored in `cage_votes`; scores are Elo worked out in the browser (`js/cage.js`), starting from your star rating so the ranking begins sensibly. Pairs favour episodes with few fights and similar scores, and avoid recent repeats
- Ranking list with W–L record per episode (🔥 unbeaten after 3+ wins); other people's pages show their ranking only
- Profile: "Cage Match champion" spot under Favourite episodes (🏆 Undefeated champion if #1 never lost and has 3+ wins); a prompt to play if you have none yet

### Report card and streak
- Mr. Garrison's Report Card (Stats tab, `js/report-card.js`): a season gets a letter grade once 40% of its aired episodes are rated (min 3, or all of a shorter season); scale A+ 4.2, A 4.0, A- 3.8, B+ 3.6, B 3.4, B- 3.2, C+ 3.0, C 2.8, C- 2.6, D 2.2. "Straight grades" is the default; the "On a curve" toggle (remembered) grades each season against your own average (your average season = B+). Each season names its ⭐ class star and 🙄 troublemaker (best and worst rated episode). 📸 Save as image (html-to-image from esm.sh; shares on phones, downloads elsewhere), otherwise INC (incomplete) with how many more it needs; seasons with nothing rated show as ABS (absent), so every aired season is on the card. Grade (A+ to F) from the average rating, attendance (watched / total), and a Garrison comment; class GPA, valedictorian, most likely to repeat a grade, and a note about the student (generous, harsh, perfect attendance…)
- Tegridy streak (`js/streak.js`): days in a row you logged something (the day you logged it, not the watch date, so back-dating or imports can't fake a streak) or "watered" (finished that day's Mystery, not a cold case, or judged 10 Cage Match fights). Every 7 streak days earns a rain day (hold 2) that covers a missed day without adding to the count. Current + longest, Randy reacts (day one, a week, at risk, fully grown, broke a 3+ day streak in the last week). An original paper-cutout cannabis plant grows with it (buds from day 60), fully grown at 100. Shown on Stats, the home page, profiles (section with "Share my streak" card: current streak only, over the sunset farm in `js/farm-scene.js`) and next to friends in Messages. Longest streaks of 7 / 30 / 100 unlock the Seed packet, Scarecrow and Golden leaf avatars (locked in the settings picker; browser-only check, no DB)
- Cage Match upgrades: "Fight within" picker (everything, 🏆 finals = your current top 10, only 4★+, a single season, specials & movies; remembered), "Ranking settled" meter (share with 3+ fights) and picks this visit, ▲▼ movement since the visit started, NEW CHAMPION (burger rain) and UPSET calls, undo brings the same fight back (Backspace), ranking shows top 50 with "Show all". Keys only work while the arena is on screen. Episode pages show your Cage Match spot and record
- Fixed: double undo / undo during a pick could drop a pick locally that was still saved; ↓ hijacked page scrolling
- Cartman hosts the Cage Match (`js/cage-host.js`): chain-link cage arena with hazard stripe and spotlight, "Cartman's Cage Match" banner and round counter, Cartman's comic speech bubble (pops on every line) with a reaction to the last fight plus a hype intro for the next (champion defending, clash of 5★ titans, mismatch, garbage fight, debut). Red / blue / 👑 champion corners, WINNER! and K.O. stamps on every pick, calls for new champion (burger rain), title defence, upset, 3+ win streak, stomp, close fight, debut; crowd reactions. Reduced motion turns the animations off
- Cage Match moved to the main nav (after Book Club); the profile tab is now "Rankings" (`cage.html?u=&view=ranking`, ranking list only, no game). Home shows a Cage Match ad next to the Book Club card, with your champion if you have one
- Book Club redesign (school library / notebook theme): home card on lined notebook paper with washi tape, hole punches and a gold "Butters' pick" sticker; club page hero notebook page with a library "Due back in N days" stamp, the pick as a book cover with spine and "This week's book" ribbon, an index-card info panel ("Checked out this week" members), Butters' review as a lined-paper note with a gold star, and "Past reads" on a wooden shelf
- Book Club voting (`club_votes`, `js/club.js` `loadPicks`): Butters suggests 3 episodes for next week (his first suggestion is the old date-based pick); members vote (one vote each, change or take back); most votes wins, ties and no votes go to Butters' first suggestion, so past weeks keep their book. Past reads show the club's average rating and how many members read it that week
- Past reads (up to 12 weeks) link to that week's club page (`club.html?week=YYYY-MM-DD`): its book, Butters' note and the reviews written that week, read-only with a green "Returned" stamp
- Character accounts (code only, not in the DB, never count toward averages): Butters (`js/butters-profile.js`, `profile.html?u=butters`) and Kyle (`js/kyle-profile.js`, `profile.html?u=kyle`, green earflap-hat avatar). Kyle has "watched" exactly 200 episodes (his ratings list topped up in air order with fixed per-episode grades, a try-hard tough grader) and reviews 23 "smart" satire episodes (incl. 2 specials), each with a reading-list note on what it spoofs. `js/guest-reviews.js` shows their reviews at the top of matching episode pages with a "Character" tag (Butters 5, Kyle 23). People can like and comment (with replies) on them: `guest_review_likes` and `guest_review_comments`, keyed by `<character>:<normalised title>`; no notifications
- Book Club history only counts weeks from CLUB_START (2026-11-23, the week it launched): no fake past reads, library card slots or Bookworm credit before that
- Profile: 📚 Library card (last 10 picks, a red READ stamp for each one read during its week, "Read N of the last 10"). New badges: 📚 Bookworm (review 3 picks during their week) and 🥊 Ringmaster (judge 100 Cage Match fights)
- Original paper-cutout art (`js/art.js`, no show characters): falling snow on the hero (the town and trees were removed by request); a snowy pine strip above every footer; boxing glove on the Cage Match ad, championship belt on champion cards; stack of books with an apple on the Book Club ad and header; bus stop sign on "nothing here" pages. Header gets a logo-colour paper stripe, episode cards tilt on hover
- Profile pictures (`js/avatars.js`, `profiles.avatar_icon`): 12 original paper-cutout icons (beanie, mittens, snowman, pine, mountain, school bus, visitors UFO, burger, gold star, boxing glove, microphone, books) on the avatar colour, picked in Settings; null keeps the first letter. Every avatar on the site shows it (all profile embeds load avatar_icon)

### Release checklist
- **Before every push run `powershell -File tools/bump-version.ps1`.** It stamps `?v=<version>` on every JS import, page script and the stylesheet, and writes `js/version.js` + `version.json`. On load, `layout.js` compares them and reloads once with `?v=` if the code is stale, so nobody runs old code after an update (GitHub Pages caches files for 10 minutes)

### Basics added
- Phone header: under 900px the nav folds into a ☰ panel (search, links, 🎲 random, admin); the top row keeps logo, bell, + Log, avatar
- Settings → Account: change email (confirmation link), change password, delete account (`delete_my_account()` RPC; type your username to confirm)
- Header search shows a live dropdown with matching people and episodes; Enter still opens the episode search
- "Describe what happened" search (`js/search.js`): header dropdown and `episodes.html` match titles, TMDB overviews and hand-written keywords (`js/data/episode-keywords.js`, only words the overview misses, plus a small synonym list). All words must match (stopwords dropped, light stemming, last word as a prefix); with 3+ words and few exact hits, ones missing a single word are listed underneath; if none match, the closest (all but one word…). Season 18+ TMDB summaries are often one vague line, so those episodes carry most of the keywords. Title matches rank first, then plot matches, which show an overview snippet with the matched words highlighted under "What happened". `episodes.html` has a "Best match" sort (default). Browser-only, no AI API. To make it discoverable the header search rotates "Try …" example placeholders and, when focused empty, shows "Can't remember the title? Describe what happened." with tappable example chips
- Book Club notifications (`js/club-notes.js`, worked out in the browser): a note when a new book starts and whether your vote won; count in the bell, read/cleared state in localStorage
- Comments: edit your own (inline), delete your own or any on your review

### Stan's tour
- Site guide (`js/tour.js`): notes from Stan in the bell and on the notifications page, worked out in the browser. A welcome, then at most one tip per day visited (log, Book Club, Cage Match, Daily Mystery, Stats/report card, badges and what they unlock, friends), skipping features already used (the friends finale is never skipped). "Speedrun the tour" (notifications page or Edit profile) delivers every remaining stop at once. Accounts older than 27 Nov 2026 only get an invite. "End the tour" on the notifications page; start/end/restart in Edit profile (a restart replays every stop). State, including read and cleared tour notes, is saved on the account (auth user metadata `tour`) and cached in localStorage, so a new device does not resend the welcome

### Characters
- 🎤 Jimmy's Comedy Roast (`js/jimmy.js`): a button on every profile ("Roast me, Jimmy" / "Get Jimmy to roast them") opens a stand-up set built from that person's real stats (harshest and softest takes vs the site average, average rating, hours, log and review counts, rewatches, Cage Match champion, streak, personality, favourite character, a low-rated Top 4 pick), with Jimmy's stutter; "Another set" rerolls
- 👦 Stan's Picks (`js/stan.js`, home page): unseen aired episodes ranked by how much people with your taste loved them (each member weighted by taste match squared, strangers lightly; someone must have rated it 4★+), falling back to the site's best-rated
- 🧥 Kenny's Daily Mystery Episode (`mystery.html`): one blurred still a day (same for everyone), 6 tries, each wrong guess or skip sharpens it and unlocks a muffled Kenny clue (see the clue order below); win/lose result, copyable 🟩🟥 share text, stats (played, win %, streak, guess distribution) in `mystery_plays` (one row per person per day; older browser-saved games move over automatically). Home card shows today's puzzle and your status; nav link "Mystery" after Cage Match. On phones (≤760px) the newest clue shows in an orange box right under the photo and scrolls into view after each wrong guess, the input isn't refocused (keyboard would cover it); the newest clue in the list gets a yellow outline
- Butters' profile (`js/butters-profile.js`, `profile.html?u=butters`): a built-in pretend account (not in the database, so it never affects averages, Stan's Picks or taste matches) with ~40 ratings (nothing under 3.5★), Top 4, joke badges, a recent diary and 5 meta reviews of popular episodes. Book Club links his name and avatar there; the username "butters" is reserved (`username_available` + a check constraint)
- 📖 Kyle's review of the day (top of the home page sidebar, above Friends' activity): one of Kyle's reviews with its note, rotating daily (day number mod review count, same for everyone), linking to the episode (like/comment) and his profile
- ✊ PC Principal's "PC it" filter (`js/pc.js`): a "Let PC Principal fix it" toggle on every review card (shared `reviewHTML`, character reviews and your own review on episode pages), shown under a purple signed "PC Principal's version" header, that rewrites the text in his voice with word swaps, a fixed opener/closer per review (about 130 swap rules incl. slang like peak, absolute cinema, goated, ngl, imo, swear words, and "Cartman" → "Eric"; 12 openers and 12 closers; ", bro" on about 2 in 5 sentences, at least one per review); "↩ Original" switches back. Browser only, nothing saved
- Jimmy's roast is one joke per click, in a speech bubble under the profile buttons (stat jokes first, reshuffles when they run out). The South Park personality joke is character-specific: `PERSONA_JOKES` has exactly 3 jokes per personality (Butters, Jimmy, Cartman, Randy, Mr. Mackey, Kyle, Kenny, Towelie, Stan), all told each round (worded "X got Kenny's personality"); the favourite-character joke uses `FAV_JOKES` (one line per main character, none for the rest). No generic character lines
- Reserved usernames: `is_reserved_username()` holds ~75 South Park character names (used by `username_available` and a check constraint on profiles), for future built-in character profiles like Butters'
- Butters' likes (`buttersLikes` in `js/butters.js`): +1 like (and first in "Liked by") on every review by paratyam, and on ~1 in 25 positive (4★+) reviews by anyone else, picked from the review id; the Book Club shows "♥ Liked by Butters" on those. You get a 🍔 notification (bell + notifications page) when he likes your review, except paratyam: worked out in the browser in `js/club-notes.js`, read state in localStorage
- Jimmy: extra stutters on every joke (`stutter()`, never the username), 35 general jokes (3 about Fishsticks, including the classic setup) alternating with the stat jokes
- Kenny's mystery (purple + orange, magnifying-glass logo `mysterySVG`): clues are A does Kenny make it, B the Parkboxd rating, C the main character (character tag, else a "group thing" line), D a three-emoji evidence bag, E Kenny's own comment with title words blanked; A, D and E come from `js/data/mystery-clues.js` (keyed by season.number, add a line when new episodes air). Wrong guesses say earlier or later season, and in the right season (🟨 in the share text) earlier or later episode. Case-file design: manila folder header with a TOP SECRET stamp, evidence photo in an orange parka-hood frame on a dark "?" board, Kenny lives (🧥 ×6) for tries, Exhibit A–E witness statements (locked until earned), CASE CLOSED / R.I.P. KENNY stamps. Badge 🕵️ Case Closed: solve 5
- Mystery extras: after your game ends, "Your friends on this case" (people you follow: squares, tries, streak; never their guesses) and, always on the page, a countdown to the next case (midnight UTC). Cold cases `mystery.html?case=N` replay past days from the list in the side panel; those plays are saved with `mystery_plays.cold` and don't count toward stats or streaks. A day's answer only draws from episodes aired by that day, so past answers stay put
- Cage Match art: personal champions (ranking, profiles, share card) wear `beltSVG`; the people's champion gets `peoplesCupSVG` (crowned cup, flames, banner). Shown under the game on Cage Match and as a banner on that episode's page (`peoplesChampion()` in js/cage.js)
- Cage Match extras: "Share my top 10" card (`drawTop10Card` in js/share.js, original art) and "The crowd's champion" between the game and your ranking (the winner only; view `cage_community`: one voice per judge, pulled toward 50%), with a Cartman verdict
- Book Club attendance (`js/attendance.js`): weeks in a row you logged the pick, best streak, one free life (forgives a missed week, shown as a small heart pill) per 10 weeks, stickers at 3/5/10/25/52 (`stickerSVG`) with Butters' lines; on the Book Club page and every profile's library card. Browser only
- Comment replies (`comments.parent_id`, `js/comments.js`): reply to any comment, shown one level deep with @name; "reply" notifications. Butters' Book Club review has its own comment thread (`butters_comments`)
- Direct messages (`messages.html`, `messages` table): only between people who follow each other (enforced by RLS); conversation list with unread counts, chat bubbles, Enter to send, refreshes every few seconds; ✉️ header button (in the ☰ menu on phones) and a 💬 Message button on mutual profiles. Cartman's "Heard that through the grapevine, did you?" heads the page
- Profile tab "Lists" (`profileTabsHTML` in js/ui.js) → `lists.html?u=name`: that person's lists under their profile tabs; the new-list form only shows on your own
- 🗂️ Tier Lord badge: rank every aired season in your Season tier list (`profiles.season_tiers`)
- Home Tegridy streak card links to your diary (it used to go to stats)
- Secret modes: a "✕ Leave Mysterion mode" / "✕ Go back to being Butters" button (bottom left) whenever Chaos or Mysterion is on, since typing the word doesn't work on phones or with a text box focused. The logo hold no longer gets cancelled by the phone's own long-press handling or link dragging
- Kyle's profile lists his reviews newest first; his reviews are 3-5 sentences
- Cartman's profile (`js/cartman-profile.js`, `profile.html?u=cartman`): another pretend account. 10 short reviews (his 4 wins 5★ and make up the Top 4, 6 losses ½★), every other aired episode rated ½-2★, and a fixed comment under each of Kyle's reviews (Kyle's profile and episode pages). A new Kyle review needs a line in `KYLE_COMMENTS`
- Kenny's profile (`js/kenny-profile.js`, `profile.html?u=kenny`): another pretend account (69 followers, 69 following, orange mittens avatar). Exactly 7 rated episodes; 4 have muffled, excited reviews (also on those episode pages, with like and comment), the other 3 are 2½★. Kenny is a child: keep reviewed episodes free of sexual or body themes
- Stan's profile (`js/stan-profile.js`, `profile.html?u=stan`): a deliberately ordinary pretend account (12 followers, 4 following, blue mountain avatar), 7 reviews of episodes no other character reviewed, one mentioning Wendy
- Badges show in a fixed order (computeBadges in js/insights.js): getting started and site games, rating habits, logging and writing, then the watch-them-all ones (Coon & Friends, Professor Chaos, Mysterion, I Thought This Was America (every Randy episode, id `tegridy`), movies) with Completionist last; on profiles unlocked badges come first, each half keeping that order. Profile tabs: Lists sits right after Watchlist

## Debug pass: phones and data limits (27 Nov 2026)
- Phones: no sideways scrolling down to 320px (header, profile, lists, messages, episode, mystery, admin); diary rows reflow; episode page shows Watch/Like/Rate right after the summary; 16px form fields and bigger link buttons on touch screens; ☰ search results no longer in capitals; app ad hides behind the menu and dialogs
- Messages on phones: no auto-open (it marked chats read unseen), no keyboard pop-up, an opened chat scrolls into view; new-message check compares the newest message
- Supabase returns at most 1,000 rows per request: use `fetchAll()` from `js/ui.js` for anything that can grow past that (ratings, logs, cage votes, tags)
- List items are added after the highest position; passwords need 8+ characters everywhere

## "You have to watch this", phone bar and more (27 Nov 2026)
- **You have to watch this** (`js/recommend.js`): button on episode pages, send to mutual followers with a note. RPC `recommend_episode()` adds it to their watchlist (unless logged), messages it, and records it in `recommendations`; trigger `notify_rec_rated` sends a `rec_rated` notification when they rate it. Shown on the recipient's episode page and watchlist until rated. SQL applied to the live DB
- **Phones** (`js/tabbar.js`): bottom bar (Home, Club, + Log, Cage, Mystery) under 900px when logged in, hidden while typing; profile tabs are one swipeable row under 640px
- **Mystery leaderboard** (`js/mystery-league.js`): you + people you follow, Monday–Sunday UTC, 7 − guesses points, no cold cases; friends' games today hidden until yours is done; last week's top detective
- **Messages** (`js/dm-cards.js`): episode links show as picture cards

## Redesign of Book Club, Cage Match and Mystery (27 Nov 2026)
- Styles are the last block of css/style.css, scoped by #club / #cage / #mystery (they win over the older rules for those pages)
- Book Club: open-book spread, library card (streak, free life, stickers, next-sticker countdown) and corkboard vote beside the discussion, scrolling shelf; past weeks use .is-archive (full width)
- Cage Match: ring with ropes, ringside control bar, champion posters side by side, top-three podium; fighter cards go horizontal on phones
- Mystery: countdown in the header, corkboard with six guess slots, leaderboard under the clues, stats and cold-case folders underneath
- Mystery sharing: `mystery.html` has its own link preview (`og-mystery.png`, drawn by `tools/make-mystery-preview.ps1`); the copied result says what the game is, pads the squares to six and explains the colours (`shareText()`)
- Share messages live in `js/share-text.js` (what it is, then the invitation, link last). Picture cards (review, Top 4, Top 10, badge, personality, report card) all use `showPicture()`: Share sends the picture and message together (the receiving app decides the order; the owner prefers this over pasting). Invite and Mystery results are one text; Mystery has one full-width share bar (share menu, or copy where the browser has none). Cold cases explain they are earlier days' episodes

## Online status (27 Nov 2026)
- Friends and Messages show a dot plus "Online now" or "Active 5m ago" (up to 7 days, then nothing); also in the open chat header (`js/presence.js`)
- Every page sends a heartbeat for signed-in users (started in `js/layout.js`): at most once a minute, paused while the tab is hidden. Online = seen in the last 150 seconds; the pages re-check every 30 seconds
- Privacy: the `presence` table has no direct access. `touch_presence()` stamps only yourself; `friends_presence()` returns only people who follow each other with you. No setting to hide it
- Until the SQL at the end of `supabase/setup.sql` is applied, the site works and shows no status. Mock harness: `?nodb` imitates that

## Badge extras switches and unlock message (27 Nov 2026)
- Edit profile > Badge extras: show or hide the rank ring, Completionist crown, Critic tag and Hot Take pepper (`profiles.flair_off`; others see a change once their 10-minute flair cache expires)
- `js/unlocks.js`: a "Congratulations!" dialog listing each newly earned badge, its avatar and perks, and a new ring if reached. Checked after logging, Cage Match picks, Mystery, follows and tier list saves (`parkboxd:progress`, fired in `js/supabase.js`) and on page load at most every 5 minutes. `profiles.badges_seen` stops repeats across devices; the first check only records what someone already has. Replaces the old secret-mode toast

## Sound effects (27 Nov 2026)
- `js/sfx.js`: short sounds made with Web Audio (no files). Off by default; "Sound effects" switch in every footer and in Edit profile, saved per device (`localStorage` `parkboxd-sound`)
- Badge unlock fanfare, burger plops (5-star Butters), fist-bump thud, eagle whoosh, Cage Match bell (new champion and upset), Mystery solved jingle, Jimmy rimshot
- Plays only within 25s of a tap, never overlapping (the fanfare cuts others off). Everything else stays silent on purpose

## More badge rewards (27 Nov 2026)
- Super Best Friends: fist-bump animation on follow. I Thought This Was America: eagle flyby when rating a Randy episode, plus a stars-and-stripes streak card (profile, Stats and share picture; home unchanged). Both animations in `js/rewards.js`, off with reduced motion (the follow toast stays)
- Bookworm: gold library card tag after your name and a gold library card on your profile; switchable in Edit profile (`flair_off` value `bookworm`)
- Case Closed: Detective tag on the Mystery leaderboard. Screw You Guys: "going home" stamp on reviews of 1 star or less. Ringmaster: Cartman announces you as guest referee in the Cage Match
- Badge checks for other people come from the flair cache (`hasBadge` / `iHave` in `js/flair.js`), cleared when you unlock something
- Edit profile > Badge extras also shows how to enter Professor Chaos and Mysterion modes, only to badge holders
- Character reviews and comments (profiles, episode pages, Book Club, Kyle's review of the day) have a "Hear what PC Principal has to say" button that shows his personalised message to that character instead of rewriting the text (`pcTalkButtonHTML` and `TALKS` in `js/pc.js`)
- Character review cards (profiles and episode pages) look exactly like member reviews, including like and comment on profiles; only the PC Principal button is worded differently (`showProfileReviews` in `js/guest-reviews.js`)
- Character profiles have a row of all five faces at the top for switching between them (`js/gang-switcher.js`)
- Book Club weekly guest (`js/club-guest.js`): Kyle, Cartman, Stan, Kenny take turns (from the club's first week) with a card under Butters' review: their line about the episode (`js/data/{kyle,cartman,stan}-notes.js`, one per episode like Butters'; Kenny's is generated muffling; add lines when new episodes air) plus one of 15 verdicts (`js/data/guest-verdicts.js`, 5 bad/average/good), seeded by week; an existing character review of that episode fixes the rating; like and comment via the guest review tables
- The five character accounts show up in the header search (People) and on Friends → Find people, listed in `js/characters.js` (a new character needs a line there)
