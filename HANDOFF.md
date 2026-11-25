# Handoff: hosting, permanent leaderboard, desktop build, 3D models

Instructions for a Claude Code session picking up this work. Read all of it before acting.

## The goal (from the game's owner)

> Make this a full-blown game with 3D models and an EXE, host it on a server for free, serve it
> through a browser so there are no hardware limits on the player's side, and have a leaderboard
> that doesn't reset.

What was agreed after looking into it:

- **Rendering on a server and streaming video to the browser is not free anywhere** (it needs a
  GPU per concurrent player, roughly $0.50-1 per player-hour). So the game keeps rendering on the
  player's own GPU, and weak hardware is handled by **Graphics: Auto** (below) instead.
- Everything else is free: Cloudflare (website, leaderboard server, database), itch.io (game page,
  web build, desktop downloads), GitHub Actions (tests and deploys), Electron (desktop EXE).

## Where things stand

Branch `ccr-9475d751-unpszh` (commit "0.19.0: Hosting, permanent leaderboard server...") has all
the code, tested: 715 tests pass, lint, typecheck and Prettier are clean. Merge it (or branch
from it) first.

**The accounts it was deployed to have been deleted.** Nothing it points at exists any more: no
leaderboard server, no database, no Pages project, no itch.io page. The game still works if
merged as is, because the leaderboard falls back to the old relay and `leaderboard/board.json`.
But the new pieces must be set up again on the new owner's accounts.

### Done in code on that branch

| Piece              | Files                                                                                                                                 | Notes                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Leaderboard server | `worker/` (`index.ts`, `board.ts`, `wrangler.toml`, `migrations/0001_init.sql`)                                                       | Cloudflare Worker + D1. `GET /board`, `POST /runs` (`{code}` or `{codes:[...]}`, up to 200). Checks every run with the game's own rules (`entryOf` in `src/game/leaderboard/board.ts`) and keeps each player's best per board, lesson and difficulty. A cron every 30 min collects the old ntfy.sh relay. The board is cached at the edge for 30 s. Ban table: `banned`. |
| Game client        | `src/game/leaderboard/board.ts` (`BOARD_API`, `sendPost`, `readServer`, `fetchBoard`), `src/ui/LeaderboardScreen.tsx`                 | Posts to the server, falls back to the relay. Reads the server, falls back to `board.json` + relay. 422/403 answers are not retried.                                                                                                                                                                                                                                     |
| Backup Action      | `.github/workflows/leaderboard.yml`, `scripts/collect-board.ts`                                                                       | Carries relay runs and `board.json` runs to the server, then writes the server's board back to `leaderboard/board.json` as a backup. Falls back to relay-only if the server is away.                                                                                                                                                                                     |
| Desktop EXE        | `desktop/main.cjs`, `desktop/dev.cjs`, `scripts/build-desktop.mjs`                                                                    | Electron 45. `npm run build:desktop -- win32 linux` gives zips in `release/`. Windows packages fine from Linux (no Wine needed). The Linux build was launched under Xvfb and runs without errors; the Windows build was not run. Unsigned, so Windows shows SmartScreen once.                                                                                            |
| itch.io upload     | `scripts/push-itch.mjs`                                                                                                               | butler push to channels `html5`, `windows`, `linux`.                                                                                                                                                                                                                                                                                                                     |
| Auto deploy        | `.github/workflows/deploy.yml`                                                                                                        | On push to `main`: lint, test, build, deploy Worker + D1 migrations, deploy Pages, build desktop, push to itch. Steps skip when their secret is missing.                                                                                                                                                                                                                 |
| Pages config       | `wrangler.toml` (root)                                                                                                                | Static site from `dist/`.                                                                                                                                                                                                                                                                                                                                                |
| Graphics: Auto     | `src/game/rendering/autoQuality.ts`, `QualityGovernor.tsx`, `GameCanvas.tsx`, `src/game/core/settings.ts`, `src/ui/SettingsPanel.tsx` | New default. Guesses low/medium/high from the GPU name, cores, memory and touch; while playing, lowers the resolution (down to 0.6x) and then the level when below 40 fps, and raises the resolution again when smooth.                                                                                                                                                  |
| 3D models          | `src/game/rendering/models/modelLibrary.ts`, `RiggedModel.tsx`, `src/assets/models/README.md`, `CaptainMesh.tsx`                      | Put `warden.glb` in `src/assets/models/` and the Warden uses it (found with `import.meta.glob`, auto-scaled to 1.7 m, feet on the ground, Idle/Walk/Run clips picked by name and cross-faded by speed, Meshopt supported). Falls back to the procedural model. Tested with a throwaway GLB, which was removed.                                                           |
| Docs               | `README.md` (Play, Shipping, 3D models, Leaderboard), `src/game/core/changelog.ts` (0.19.0), `package.json` 0.19.0                    |                                                                                                                                                                                                                                                                                                                                                                          |

### Values tied to the deleted accounts: replace all of them

| File                            | Value                                                             |
| ------------------------------- | ----------------------------------------------------------------- |
| `src/game/leaderboard/board.ts` | `BOARD_API = 'https://dandori-board.dandori-academy.workers.dev'` |
| `worker/wrangler.toml`          | `database_id = "6be8de5d-..."`                                    |
| `worker/index.ts`               | URL in the header comment                                         |
| `.github/workflows/deploy.yml`  | `CLOUDFLARE_ACCOUNT_ID: 05c753f6...` and the Pages URL comment    |
| `wrangler.toml`                 | Pages URL comment (and `name`, if the project name changes)       |
| `scripts/push-itch.mjs`         | `ITCH_GAME = 'sgtseamonkey/dandori-academy'`                      |
| `README.md`                     | Pages URL, itch.io URL, Worker URL                                |
| `src/game/core/changelog.ts`    | 0.19.0 entry mentions `dandori-academy.pages.dev`                 |

Then rebuild `docs/` (`npm run build:docs`), because that build has the old `BOARD_API` baked in.

## What the human does (accounts)

Ask the owner to do these. They can't be done by Claude:

1. **Cloudflare**: sign up (free plan, no card). Open **Workers & Pages** once, which creates the
   account's `*.workers.dev` subdomain (or let Claude create it with the API; ask the owner what
   name they want first, because it becomes part of the leaderboard URL).
2. **Cloudflare API token** (My Profile → API Tokens → "Edit Cloudflare Workers" template, then
   add **Account · D1 · Edit**). This is only needed to deploy the leaderboard server. Keep a copy
   somewhere safe.
3. **Website**: in the Cloudflare dashboard, go to **Workers & Pages → Create → Pages → Connect to
   Git**, pick this repo, production branch `main`, build command `npm run build`, output
   directory `dist`, environment variable `NODE_VERSION=22`. Cloudflare then rebuilds the site on
   every push, with no token or secret. Recommended over deploying Pages from the Action.
4. **itch.io**: sign up, then Dashboard → Create new project → kind **HTML**, save as a draft
   (itch.io has no API to create a page). After the first upload, edit the page: tick "This file
   will be played in the browser" on the `html5` upload, set 1280×720, enable the fullscreen
   button.
5. **itch.io API key** (Settings → API keys).
6. **GitHub secrets** (repo Settings → Secrets and variables → Actions): `CLOUDFLARE_API_TOKEN`
   and `BUTLER_API_KEY`.

## What Claude does, in order

1. Merge or branch from `ccr-9475d751-unpszh`. Run `npm ci`, `npm test`, `npm run lint`,
   `npm run typecheck`, `npx tsc -p worker --noEmit`.
2. Get from the owner: the Cloudflare account ID, the workers.dev subdomain, the itch.io
   `username/game-slug`, and the Pages project name and URL.
3. Create the database and deploy the server:
   `npx wrangler d1 create dandori-board`, put the new id in `worker/wrangler.toml`, then
   `npx wrangler d1 migrations apply dandori-board --remote --config worker/wrangler.toml` and
   `npx wrangler deploy --config worker/wrangler.toml`. Check `GET /` answers `{"ok":true,...}`.
4. Replace every value in the table above. Set `BOARD_API` to the new Worker URL.
5. **Carry the existing scores over**: run `npm run board:collect`. It posts every run in
   `leaderboard/board.json` to the new server. Then `GET /board` should hold the same number of
   runs as the file (51 at handoff time, possibly more now).
6. Since Pages now builds from GitHub (step 3 for the human), remove the "Web build (Cloudflare
   Pages)" step from `.github/workflows/deploy.yml`, and update its header comment and the
   README's Shipping section. Keep the Worker and itch.io steps.
7. Rebuild `docs/`, run all checks, commit, push, and open a PR only if the owner asks.
8. Once the itch.io page exists: `npm run build:desktop -- win32 linux`, then
   `node scripts/push-itch.mjs web win32 linux` (with `BUTLER_API_KEY` set), or let the Deploy
   Action do it on merge to `main`.
9. Check it end to end: play a challenge on the live site and the desktop build, finish a day
   with a personal best, and see it on the Leaderboard tab.

## Gotchas found the first time

- **Claude Code cloud sessions**: if API keys are injected by the session's network proxy, the
  proxy overwrites the `Authorization` header. `wrangler pages deploy` and Workers static-assets
  uploads send a short-lived upload token in that header, so they fail there with
  `Authorization failed [code: 8000013]`. Plain Worker deploys and D1 work. That is why the
  website goes through Pages' Git integration (or the Action), not a direct upload from the
  session. Running locally with `CLOUDFLARE_API_TOKEN` set has no such problem.
- With proxy-injected keys, set `CLOUDFLARE_API_TOKEN=proxy-injected` and `BUTLER_API_KEY=proxy-injected`
  so the tools start. butler talks to **`api.itch.io`**, not `itch.io`: both hosts need the key.
  The itch.io account check is `https://itch.io/api/1/key/me`.
- Node's built-in `fetch` ignores `HTTPS_PROXY`: run `board:collect` behind a proxy with
  `NODE_USE_ENV_PROXY=1` (Node ≥ 22.21).
- The first `wrangler deploy` of a new Worker can fail with "This Worker does not exist" right
  after uploading. Just run it again.
- `functions/` (Pages Functions) was tried for the API and dropped: they can't run on a schedule,
  and the Worker needs its cron for the relay.
- butler cannot create the itch.io game; push fails with `invalid game` until the page exists.

## Is it free and allowed?

- Cloudflare free plan: Pages has unlimited bandwidth and 500 builds a month; Workers has 100,000
  requests a day; D1 has 5 GB and 5 million rows read a day. At a limit it stops serving for the
  day and never bills. A browser game plus a small score API is normal use.
- itch.io: free for HTML5 games and downloads; the revenue share is the owner's choice (0% is
  allowed).
- GitHub Actions: free on public repos; 2,000 minutes a month on private ones (about 10 per
  deploy).
- Electron: MIT licence, fine to ship. 3D models: use ones whose licence allows it (Kenney and
  Quaternius packs are CC0).
- Optional cost: a code-signing certificate (about $100-300 a year) removes the Windows
  SmartScreen warning. Most free itch.io games ship unsigned.

## Still to do toward the "full-blown game"

- Real 3D models. Only the Warden slot exists. Next: Emberlings (`WorkerInstances.tsx`, drawn as
  instanced parts, so a GLB needs splitting into instanced geometry or a different approach),
  beasts (`EnemyMeshes.tsx`) and relics (`models/RelicModel.tsx`). Add each as a slot in
  `MODEL_SLOTS`.
- Optional: a macOS build (needs signing and notarisation to open without warnings), code signing
  on Windows, and a GitHub Release with the desktop zips on each version tag.
