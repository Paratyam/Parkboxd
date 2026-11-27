# Parkboxd

Letterboxd-style site for South Park episodes. Live at https://parkboxd.pages.dev (Cloudflare Pages, auto-deploys `main`; no build step). The old https://paratyam.github.io/Parkboxd (GitHub Pages, same branch) still works.
The owner's username is **paratyam**. Claude writes all the code; keep explanations short.

## Stack
- Plain HTML/CSS/JS, ES modules, **no build step**. One HTML file per page at the root, its script in `js/pages/<page>.js`.
- Shared modules in `js/` (layout.js = header/nav/search/bell/version check, social.js = review cards, ui.js = helpers, supabase.js = client).
- Styles: `css/style.css` (single file).
- Backend: Supabase project `qsphypdibcydipkhpkvs` (auth, Postgres, RLS). Episode data in `js/data` / `js/episodes.js`.
- Feature notes live in `PLAN.md`. Update it when adding a feature.

## Before every push
Run `powershell -NoProfile -ExecutionPolicy Bypass -File tools/bump-version.ps1` when any JS, HTML or CSS changed.
It stamps `?v=` on every import/script/stylesheet and updates `js/version.js` + `version.json`; without it browsers keep stale modules.
Then commit and push to `main` (that's the deploy). Docs-only changes don't need the bump.

## Database changes
- Run SQL in the Supabase SQL editor (browser pane, user is signed in): set the Monaco editor value with JS, click Run.
- Always append the same SQL to `supabase/setup.sql`.
- Use RLS + explicit grants; privileged actions go through `security definer` RPCs.
- Embedding profiles from `logs` is ambiguous: use `profiles!logs_user_id_fkey`.

## Gotchas
- Use double quotes for JS strings containing apostrophes (`"Cartman's"`); single-quoted ones broke the build several times.
- Don't put constants after top-level `await` if functions called earlier use them (TDZ errors).
- `design-mockup/` is gitignored; anything to publish goes in `previews/`.
- Can't test logged-in pages as the user; verify with a mocked harness or ask them.

## Content rules
- Cartman calls his own mother "mem", never "mom".
- Gender-neutral copy for users.
- No copyrighted South Park art: only original paper-cutout style art (`js/art.js`). Exception the owner chose: TMDB episode stills on the share cards.
- Reserved character usernames: `is_reserved_username()` in the DB.
- Home page layout is final: don't change it unless asked.

## Characters / features (where to look)
- Butters' Book Club: `js/club.js`, `js/butters.js`, `js/butters-profile.js`, `js/club-notes.js`, `club.html`
- Cartman's Cage Match (Elo): `js/cage.js`, `js/cage-host.js`, `cage.html`
- Garrison's Report Card: `js/report-card.js`; Tegridy streak: `js/streak.js`; badges: `js/insights.js`
- Jimmy's roast: `js/jimmy.js`; Stan's Picks: `js/stan.js`; Mackey's content notes: `js/mackey.js`; Mr. Hankey's advent calendar: `js/pages/hankey.js`; share cards: `js/share.js`; invite links: `js/invite.js`; Kenny's Daily Mystery: `js/pages/mystery.js`
- Character accounts: `js/butters-profile.js`, `js/kyle-profile.js`, `js/cartman-profile.js`, `js/kenny-profile.js`; their episode-page reviews `js/guest-reviews.js`
- Comments/replies: `js/comments.js`; DMs: `js/pages/messages.js`; avatars: `js/avatars.js`

## Saving usage
- Small copy/text edits: just edit and push, skip browser testing unless asked.
- Prefer reading only the relevant file section over whole large files.
