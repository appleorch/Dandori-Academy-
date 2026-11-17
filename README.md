# Dandori Academy

_The Grand Botanical & Clockwork Academy._

A browser RTS about dandori: planning work so that nobody stands idle. You lead a squad of
small workers, throw them at jobs, and move on while they finish on their own. The day is
scored on how much you brought home and how quickly.

This repository implements the MVP defined in the project handoff document (one worker type,
one captain, one home base, one enemy type, one treasure type, throwing, whistling, carrying,
treasure delivery, a day timer and dandori scoring) plus the academy around it: twenty-five lessons
across four terms and the caves under the school, four bosses, a story, ranks, and progression from one
lesson to the next.

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
| F / middle mouse    | Charge: send the whole squad running to the cursor   |
| Q                   | Dismiss the squad                                    |
| Shift (hold)        | Fast-forward the day at three times speed            |
| Tab (hold)          | Look at your idle Emberlings                         |
| V                   | Tactical view over the whole course                  |
| Esc                 | Pause (resume, restart with R, settings, quit)       |
| Mouse wheel         | Zoom                                                 |

On a phone or tablet the game shows touch controls instead:

| Touch                    | Action                                                |
| ------------------------ | ----------------------------------------------------- |
| Joystick (bottom left)   | Move the Warden                                       |
| Touch the field (hold)   | Throw squad members at that spot                      |
| Whistle button (hold)    | Call workers around the Warden; drag to move the call |
| Charge / Dismiss buttons | Send the squad to where you last aimed / dismiss it   |
| Fast-forward button      | Hold to hurry the day along                           |
| Two-finger pinch         | Zoom                                                  |

- **Emberlings** are your workers. Thrown next to a job, they start it by themselves. Idle
  ones (pale, with a cold tip) pick up any work within a few steps.
- **Sunshards** show `carriers / needed`. Once staffed they walk home to the **Kiln**; extra
  carriers (up to double) make them faster.
- **Enemies fight back**, and every attack is telegraphed. Workers thrown onto an enemy cling
  to its back and are safe there until it shakes them off. Throws aimed near an enemy home in.
  - **Mossback**: bites what is in front of it. It shudders, shakes its attackers off, then
    turns to eat the dazed ones lying on the ground: whistle them clear in time.
  - **Ramhorn**: paints a lane on the ground, then charges down it, trampling up to four
    workers and knocking the Warden back. Step aside and pile on while it stands winded.
  - **Bogspitter**: fragile, but lobs globs from long range. A red ring shows where one will
    land; anything still inside is flattened.
  - Every carcass hauled home becomes new Emberlings (4, 7 and 3).
- **Bramble gates** block a path until enough Emberlings break them; hauls behind a gate
  wait until it falls. **Dew drips** fall on the dark wet patches and knock carriers off their
  haul. **Glowcaps** sprout partway through some days and wilt if left: bonus score.
- **Bosses** have a health bar across the top that says when they can be hurt. The Gravelmaw's
  plates take a quarter damage except while it lies winded after a slam; the Lanternroot is
  shielded while any root-knot glows; the Bellwether is armoured except after charging into
  stone. Off-duty Emberlings scramble out of slam rings and charge lanes on their own.
- **More to carry and do**: **mounds** are dug up by idle Emberlings and reveal a shard, pod or
  Sapdrop; **Span-logs** go to a riverbank, and enough of them build a bridge; **Sapdrops**
  speed every haul up by 40% for 30 seconds; **twin shards** (matching runes) earn a 50% bonus
  when both arrive within 10 seconds; **Dewglass** is worth more but cracks if its crew breaks
  up mid-haul; **Lodestones** crawl with a minimum crew and run with a triple one.
- **Reading danger**: a red disc shows where a bite will land, a "!" and a red line mark an enemy
  hunting something, an amber ring shows an enemy's hunting radius as the Warden approaches, a
  gauge fills before a shake, workers about to be hit flash white, and the minimap and red
  screen-edge arrows show threatened Emberlings off screen.
- **Beacons** are cold until the Warden walks up to them. A lit beacon is a second drop-off:
  every haul goes to the Kiln or a lit beacon, whichever is the shorter walk, and Emberlings
  from a pod hatch where the pod was delivered.
- **The Undercroft** is a dungeon: rock everywhere except its rooms and corridors, no daylight,
  and only the Warden's lantern and the beacons to see by. **Skitters** are weak cave vermin
  that hunt in packs and take one Emberling per bite. **The Snuffer**, its boss, cannot be
  hurt in the dark at all: inside a lit beacon's glow it is armoured, and open while it lies
  winded after a slam. At two thirds and one third of its health it puts out the beacons
  around it and calls two Skitters; walk back to a beacon to relight it.
- **Proctor Ashwick** offers a line of advice now and then: the controls in the first lessons,
  and after that what you seem to be missing (idle Emberlings, a winded boss, dazed workers
  about to be eaten). Settings can turn it off.
- **Terraces and ledges**: raised ground is ringed by cliffs. Emberlings can be thrown up a cliff,
  but hauls, the Warden and walking Emberlings use the stairs. A **ledge** (yellow chevrons) is a
  one-way edge: anything can step down off it, nothing climbs back. Heights only change how the
  world looks; the rules are worked out on the flat nav grid, where a ledge is a cell that can
  only be entered in its drop direction.
- **Relics of Harmony**: every Sunshard is set into a named relic with its own model and a line of
  description (`src/game/story/relics.ts`). Recovered relics fill the **Field Guide**.
- **Headmaster Sprocket** comments on the day in a banner: openings, chains, rare relics,
  disasters and milestones (`src/game/story/headmaster.ts`), and gives a verdict on the results.
- **Tactical view**: V, or the Map button on touch, pulls the camera out over the whole course.
  Edge markers point to the Kiln and to the nearest relic nobody has lifted.
- **Personal bests and chains**: each Sunshard delivered is compared with the same shard on your
  fastest clear of that lesson (green ahead, red behind), and deliveries within six seconds of
  each other build a chain. Neither changes the score; both are there to chase.
- **Wardrobe**: outfits for the Warden, earned with medals and feats, chosen under Wardrobe &
  settings (`src/game/progression/outfits.ts`).
- **Emberpods** are light orange hauls. One carrier takes a pod home, where it hatches into two
  new Emberlings.
- You can throw over walls. Hauls cannot go over them, so they take the long way home.
- The day ends when every Sunshard is home, time runs out, the Warden is down, or no
  Emberlings remain. Leftover time only scores if everything was collected.

## Lessons and progression

| #   | Lesson               | Teaches                                                    |
| --- | -------------------- | ---------------------------------------------------------- |
| 1   | Many Hands           | Staffing: give each haul exactly the carriers it needs     |
| 2   | Over the Wall        | Throwing over walls while hauls take the long way home     |
| 3   | The Guard            | Fighting a Mossback and growing the squad from its carcass |
| 4   | First Light          | Three lanes and three guards: choosing an order            |
| 5   | Long Haul            | A large field where the walk home dominates                |
| 6   | Divide and Conquer   | Splitting the squad across many jobs at once               |
| 7   | The Gauntlet         | Clearing a corridor of guards, then hauling through it     |
| 8   | Growing Pains        | Starting small and growing the squad from carcasses        |
| 9   | Switchbacks          | Long zigzag hauls past walls you can throw over            |
| 10  | Final Exam           | Ten shards, six guards, walls everywhere                   |
| 11  | Bramble Gate         | Breaking gates so hauls behind them can come home          |
| 12  | Drip Line            | Overstaffing hauls that must cross dripping ground         |
| 13  | Gravelmaw's Pit      | Boss: dodge the slam, strike while it lies winded          |
| 14  | Three Roots          | Boss: fell three root-knots together to drop its shield    |
| 15  | Rush Hour            | Everything at once, with Glowcap bonuses mid-day           |
| 16  | The Bellwether       | Final boss: bait its charge into a pillar                  |
| 17  | Crossroads           | A hub with four doors and a ring road; digging mounds      |
| 18  | The Span             | Building bridges from Span-logs, or risking the ford       |
| 19  | Matched Pairs        | Timing twin shards and Sap for bonuses                     |
| 20  | Glass River          | Fragile Dewglass across bridges and drips                  |
| 21  | Graduation Day       | Everything at once on the biggest field                    |
| 22  | The Undercroft       | A dungeon: beacons, a chasm, Skitters and the Snuffer      |
| 23  | Terrace Gardens      | Terraces: throw up the cliff, haul down the stairs         |
| 24  | The Long Drop        | A high plateau with one-way ledges as the way home         |
| 25  | Crystal Conservatory | Crystal gates and outposts that move the base forward      |
| 26  | Clockwork Causeway   | A short, dangerous crossing or a safe bridge to build      |
| 27  | Restoration Day      | The whole Terrarium, and a Gravelmaw                       |
| 28  | The Cistern          | Side lesson: a flooded cave hall, a bridge and twin shards |
| 29  | Skitter Warren       | Side lesson: fifteen small chambers full of Skitters       |
| 30  | The Root Cellar      | Side lesson: a Lanternroot fought in the dark              |

Lessons 23 to 27 are **the Grand Curriculum**, five examinations in the old Terrarium, each at
least three times the area of an early lesson and built from multi-zone courses: raised terraces
with cliffs and stairways, one-way ledges, crystal gates and outposts (see
`src/game/world/course.ts` and `src/game/world/levels/curriculum.ts`).

Lessons 28 to 30 are **the Depths**: cave lessons that are not part of the numbered run. Each
is found through an old way down (a ring of stones round a dark stair, blue on the minimap) in
lesson 19, 20 or 21. Standing on it records the find in the save; from there press E to go
straight down, which abandons the current day, or play it later from the lesson list.

The lessons are told as a story in four terms and an ending: Kindling (1 to 5, spring meadow),
Field Work (6 to 10, autumn), The Wild Marches (11 to 16, marsh), The Long Road (17 to 21,
dusk) and The Undercroft (22, a cave). Each setting has its own ground, trees, sky, weather and
music. Before a day, Proctor Ashwick gives a briefing; passing a lesson at Silver or better adds
an entry to the Journal tab, and finishing a term adds a note from Tindle, the squad's first
Emberling. The text lives in `src/game/story/story.ts`.

Each day is ranked Bronze, Silver, Gold or Platinum against the lesson's par score. Silver or
better unlocks the next lesson. Best rank and best score per lesson are saved in the browser.
Each lesson sets a Platinum time (`platinumTime` in `src/game/world/level.ts`): bring every
Sunshard home by then without losing an Emberling and the day is Platinum. The par score is
derived from that time, and Gold and Silver need 85% and 55% of par. The lesson list, the pause
menu and the results screen show every rank's score and the clock time it needs. Platinum times
are about 10% slower than the greedy test player in `src/game/world/testBot.ts` (30% on the
first three lessons, 20% on boss fights), and `level.test.ts` requires it to earn Platinum on
every lesson, so every rank is always reachable. `npm run balance` plays every lesson on both
difficulties and rewrites [BALANCE.md](BALANCE.md) with clear times, losses and ranks; that table
is how the targets are checked whenever a lesson or a rule changes.

## Hard mode

The lesson list has a Normal / Hard switch. A lesson's Hard mode opens after earning Gold on it
on Normal, and keeps its own best rank and score. On Hard (`src/game/core/difficulty.ts`):
enemies have 25% more health and wind up 15% faster, the Warden has two hearts, drips kill up
to three Emberlings, each lost Emberling costs 20 points instead of 10, and the day is 10%
shorter while the Platinum finish time stays the same. The greedy bot is only required to bring
home at least 80% of the shards on Hard; on the largest maps it falls a shard or two short.

## Settings, save files and achievements

- **Settings** (main menu, or the pause menu during a day): graphics level, carrier counts,
  enemy health bars, pause when the window loses focus, advice from Ashwick, briefings, sound
  and music volume, and zoom speed. They apply immediately and
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
- **Achievements**: 23 on the list, from First Delivery to Dandori Master (Platinum in every
  lesson), and a few that stay off the list until they are earned. Counter achievements show progress bars. New ones are announced on the results
  screen, and an older save is granted anything it already qualifies for when it loads.

## Architecture

```text
src/
  game/
    core/         ECS, fixed-step clock, seeded RNG, tuning config, settings, Zustand store
    simulation/   Simulation (state + step order), components, Rapier physics world
    world/        level types, per-chapter level modules (levels/), course and dungeon
                  builders, height map, entity spawners and the test player
    navigation/   nav grid, steering and obstacle sliding
    pathfinding/  A*, flow fields, min-heap
    captain/      captain movement and damage
    commands/     input state and DOM input controller
    workers/      worker state machine, squad and task assignment
    flocking/     spatial-hash separation
    throwing/     throw system
    whistle/      whistle system
    carry/        haul movement and delivery, bridge sites and beacons
    kiln/         worker production
    enemies/      enemy kinds, behaviour, combat and globs
    audio/        synthesised sound effects, ambience and the music sequencer
    story/        chapters, briefings, journal text and the in-day coach
    dandori/      scoring and ranks
    progression/  achievements
    save/         save data, validation, persistence and save files
    camera/       camera rig
    rendering/    React Three Fiber scene: terrain, architecture, scenery, the instanced
                  Emberling rig, the Warden, relic models (models/), particles and feedback
  poker/          a card game: rules engine, players and its own 3D room
  ui/             menus, HUD, briefing, journal, pause, results, achievements and settings
```

The simulation is plain TypeScript with no rendering or DOM dependencies. It advances in
fixed 1/60 s steps from an `InputState` and a seeded RNG, so a day is fully deterministic
(tested), which is the base the later replay and lockstep phases need. Rendering reads the
simulation every frame; React state is only used for the HUD and for entity lists. Each step
also records events (a throw, a bite, a delivery); the feedback layer turns those into sound,
particles, camera shake and score popups, so the simulation itself stays free of presentation.

Sound is synthesised at run time (`src/game/audio/`): effects are panned by where they happen
and sent to a reverb sized for the setting; the music is a step sequencer whose songs are
written as data in scale degrees, with parts that join in as the mood rises from calm to
danger, a switch to the boss tune when a boss is roused, and a faster tempo for the last thirty
seconds of a day.

Performance: every Emberling part (body, eyes, legs, feet, arms, basket, sprout, leaves, ember
and so on) is one instanced mesh, so a full field of 100 costs about fifteen draw calls; walls,
terrace stairs, scenery and ruins are instanced the same way. On the largest course a frame makes
roughly 160 to 340 WebGL draw calls (counted in the browser, Medium graphics). A simulation step on
the largest course stays under 2 ms (enforced by `src/game/world/course.test.ts`), and the handoff
stress scenario (100 workers, 20 enemies, 50 carry tasks) costs about 0.35 ms per step.

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

| Phase | Scope                                  | Status                                                  |
| ----- | -------------------------------------- | ------------------------------------------------------- |
| 1     | Bootstrap, main loop, world scene, ECS | Done                                                    |
| 2     | Captain, camera, navigation, rendering | Done                                                    |
| 3     | Workers, flocking, throwing, whistling | Done                                                    |
| 4     | Carrying, home base, treasure delivery | Done                                                    |
| 5     | Enemy AI, combat, territory            | Done: three enemy kinds, territory, telegraphed attacks |
| 6     | Dandori scoring, lessons, progression  | Done: thirty lessons, ranks, unlocks, achievements      |
| 7     | Caves, bosses, weather                 | One cave lesson and four bosses; weather is visual only |
| 8     | Replays, multiplayer foundations       | Not started (simulation is already deterministic)       |

Known limits: the JS bundle is about 5.5 MB because the Rapier build embeds its WASM; audio is
synthesised and checked by machine only (every effect, track and ambience plays without error
and at a sensible level), not tuned by ear; frame rate has been measured for the simulation
only, not on real GPUs, and the cave lesson uses more lights than the others.
