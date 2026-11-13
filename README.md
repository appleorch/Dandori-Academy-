# Dandori Academy

A browser RTS about dandori: planning work so that nobody stands idle. You lead a squad of
small workers, throw them at jobs, and move on while they finish on their own. The day is
scored on how much you brought home and how quickly.

This repository implements the MVP defined in the project handoff document (one worker type,
one captain, one home base, one enemy type, one treasure type, throwing, whistling, carrying,
treasure delivery, a day timer and dandori scoring) plus the academy around it: ten lessons,
ranks, and progression from one lesson to the next.

## Run it

```sh
npm install
npm run dev        # play at http://localhost:5173
npm test           # unit, integration, full-level and stress tests
npm run typecheck
npm run lint
npm run build
```

## Play without installing anything

`docs/` holds a ready-to-serve build. With GitHub Pages enabled (Settings, Pages, Deploy from a
branch, folder `/docs`) the game runs at `https://<owner>.github.io/Dandori-Academy-/`. Rebuild
it after changes with `npm run build:docs`.

## How to play

| Input               | Action                                               |
| ------------------- | ---------------------------------------------------- |
| WASD / arrows       | Move the Warden                                      |
| Left mouse (hold)   | Throw squad members at the cursor                    |
| Right mouse / Space | Whistle: call every worker in the circle back to you |
| Q                   | Dismiss the squad                                    |
| Esc                 | Pause (resume, restart, settings, quit)              |
| Mouse wheel         | Zoom                                                 |

- **Emberlings** are your workers. Thrown next to a job, they start it by themselves. Idle
  ones (pale, with a cold tip) pick up any work within a few steps.
- **Sunshards** show `carriers / needed`. Once staffed they walk home to the **Kiln**; extra
  carriers (up to double) make them faster.
- **Mossbacks** eat workers on the ground. Workers thrown onto one cling to its back and are
  safe until it shakes them off, so hit it with enough of them at once. Its carcass, hauled
  home, becomes four new Emberlings.
- You can throw over walls. Hauls cannot go over them, so they take the long way home.
- The day ends when every Sunshard is home, time runs out, the Warden is down, or no
  Emberlings remain. Leftover time only scores if everything was collected.

## Lessons and progression

| #   | Lesson             | Teaches                                                    |
| --- | ------------------ | ---------------------------------------------------------- |
| 1   | Many Hands         | Staffing: give each haul exactly the carriers it needs     |
| 2   | Over the Wall      | Throwing over walls while hauls take the long way home     |
| 3   | The Guard          | Fighting a Mossback and growing the squad from its carcass |
| 4   | First Light        | Three lanes and three guards: choosing an order            |
| 5   | Long Haul          | A large field where the walk home dominates                |
| 6   | Divide and Conquer | Splitting the squad across many jobs at once               |
| 7   | The Gauntlet       | Clearing a corridor of guards, then hauling through it     |
| 8   | Growing Pains      | Starting small and growing the squad from carcasses        |
| 9   | Switchbacks        | Long zigzag hauls past walls you can throw over            |
| 10  | Final Exam         | Ten shards, six guards, walls everywhere                   |

Each day is ranked Bronze, Silver, Gold or Platinum against the lesson's par score. Silver or
better unlocks the next lesson. Best rank and best score per lesson are saved in the browser.
Each lesson sets a Platinum time (`platinumTime` in `src/game/world/level.ts`): bring every
Sunshard home by then without losing an Emberling and the day is Platinum. The par score is
derived from that time, and Gold and Silver need 80% and 55% of par. The lesson list, the pause
menu and the results screen show every rank's score and the clock time it needs. Platinum times
are about 1.3 times slower than the greedy bot in `src/game/world/level.test.ts`, and that test
requires the bot to earn Platinum on every lesson, so every rank is always reachable.

## Settings, save files and achievements

- **Settings** (main menu, or the pause menu during a day): shadows, carrier counts, enemy
  health bars, pause when the window loses focus, and zoom speed. They apply immediately and
  are remembered per browser.
- **Save files**: progress saves to the browser after every day. Settings & save offers
  _Download save file_ and _Load save file_, which shows what the file contains and asks before
  replacing current progress. _Erase all progress_ also asks first. Files use the binary
  `.dandori` format (`src/game/save/saveFile.ts`): the save data is scrambled with a
  SHA-256 keystream and sealed with HMAC-SHA-256, so a text editor shows noise and any edited
  byte makes the file refuse to load. The keys ship with the game, so this deters casual
  editing, not someone reading the source. Progress kept in the browser is still plain JSON.
- **Version and revision history**: shown on Settings & save, from `src/game/core/changelog.ts`.
  A test keeps its newest entry equal to the version in `package.json`.
- **Achievements**: 15 of them, from First Delivery to Dandori Master (Platinum in every
  lesson). Counter achievements show progress bars. New ones are announced on the results
  screen, and an older save is granted anything it already qualifies for when it loads.

## Architecture

```text
src/
  game/
    core/         ECS, fixed-step clock, seeded RNG, tuning config, settings, Zustand store
    simulation/   Simulation (state + step order), components, Rapier physics world
    world/        level definitions and entity spawners
    navigation/   nav grid, steering and obstacle sliding
    pathfinding/  A*, flow fields, min-heap
    captain/      captain movement and damage
    commands/     input state and DOM input controller
    workers/      worker state machine, squad and task assignment
    flocking/     spatial-hash separation
    throwing/     throw system
    whistle/      whistle system
    carry/        haul movement and delivery
    kiln/         worker production
    enemies/      enemy behaviour and combat
    dandori/      scoring and ranks
    progression/  achievements
    save/         save data, validation, persistence and save files
    camera/       camera rig
    rendering/    React Three Fiber scene
  ui/             menus, HUD, pause, results, achievements and settings screens
```

The simulation is plain TypeScript with no rendering or DOM dependencies. It advances in
fixed 1/60 s steps from an `InputState` and a seeded RNG, so a day is fully deterministic
(tested), which is the base the later replay and lockstep phases need. Rendering reads the
simulation every frame; React state is only used for the HUD and for entity lists.

Performance: workers are drawn with two instanced meshes. The handoff stress scenario
(100 workers, 20 enemies, 50 carry tasks) costs about 0.35 ms of simulation per step in the
stress test, against a 16.7 ms frame.

## Deviations from the handoff document

Each of these is deliberate.

1. **Original names and look.** The handoff describes the game with another game's names and
   creatures. This project keeps the genre and mechanics but uses its own cast: Emberlings,
   the Warden, the Kiln, Mossbacks and Sunshards. Folder names follow: `workers/` instead of
   `pikmin/`, `kiln/` instead of `onion/`.
2. **Save format.** `SaveData` matches the handoff field for field, except `pikminCounts` is
   named `workerCounts`, and three fields were added: `bestScores` (per-lesson bests),
   `achievements` (earned ids with dates) and `totals` (days, treasures, enemies, losses).
   Saves without them still load.
3. **Only folders with code exist.** Folders for later phases (caves, bosses, weather, replay,
   multiplayer and so on) are created when their phase starts, in line with "no dead code".
4. **Rapier's role.** Rapier owns the static level geometry and the captain's character
   controller. Workers, hauls and enemies move on the nav grid, which is what keeps 100+
   units cheap.
5. **Vitest** was added as the test runner. The locked stack names no runner, and "all
   systems unit-testable" needs one.

## Status against the handoff phases

| Phase | Scope                                  | Status                                                     |
| ----- | -------------------------------------- | ---------------------------------------------------------- |
| 1     | Bootstrap, main loop, world scene, ECS | Done                                                       |
| 2     | Captain, camera, navigation, rendering | Done                                                       |
| 3     | Workers, flocking, throwing, whistling | Done                                                       |
| 4     | Carrying, home base, treasure delivery | Done                                                       |
| 5     | Enemy AI, combat, territory            | Done for one enemy type                                    |
| 6     | Dandori scoring, lessons, progression  | Scoring, ranks, saves and one lesson; no lesson select yet |
| 7     | Caves, bosses, weather                 | Not started                                                |
| 8     | Replays, multiplayer foundations       | Not started (simulation is already deterministic)          |

Known limits: the JS bundle is about 5.5 MB because the Rapier build embeds its WASM; there
is no audio; frame rate has been measured for the simulation only, not on real GPUs.
