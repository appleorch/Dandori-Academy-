# Dandori Academy

_The Grand Botanical & Clockwork Academy._

A browser RTS about dandori: planning work so that nobody stands idle. You lead a squad of
small workers, throw them at jobs, and move on while they finish on their own. The story is an
open expedition kept from day to day; Time Attack runs the Academy's lessons against the clock;
each challenge has twelve fields built for its own rules; battles race a rival Warden.

This repository implements the MVP defined in the project handoff document (one worker type,
one captain, one home base, one enemy type, one treasure type, throwing, whistling, carrying,
treasure delivery, a day timer and dandori scoring) plus the academy around it: twenty-five lessons
across four terms and the caves under the school, four bosses, an open story expedition, sixty challenge
fields, ranks, and progression from one lesson to the next.

## Run it

```sh
npm install
npm run dev        # play at http://localhost:5173
npm test           # unit, integration, layout and stress tests (well under a minute)
npm run test:levels  # whole days played by the test player on every field (about ten minutes)
npm run test:all   # both
npm run e2e        # builds, then plays the build in a browser (Playwright): every mode, offline
npm run typecheck
npm run lint
npm run build
```

**Performance.** Press **F3** during a day for frame rate, frame time, draw calls and triangles
per frame, and the simulation's time per frame. The first screen loads only the menus (about
190 KB gzipped); the 3D scene and the physics engine (Rapier, whose WASM is inlined in its ~1.7 MB
chunk) load in idle time once the menus are up, and the libraries sit in chunks of their own so a
new game build leaves them cached (`vite.config.ts`). On a device that has never had its graphics
settled, the first day's frame times are measured once and the graphics lowered if the day runs
under about 25 fps (`src/game/rendering/QualityTuner.tsx`); it never raises a level and never
overrides one the player chose. `src/game/simulation/performance.test.ts` keeps ten seconds of the
Wild Quad with a full field of 100 Sproutlings within a time budget.

**Quality checks.** CI (`.github/workflows/ci.yml`) runs the type check, lint, formatting, `npm
test` and the build on every push, the whole-day level runs as four parallel jobs, and the
end-to-end tests (`e2e/`), which play every mode in the production build and start a day with the
network off. Where Chromium is preinstalled (as in Claude's cloud sessions), set `PW_CHROMIUM` to
its path to use it; otherwise run `npx playwright install chromium` once.

**Offline and install.** The built game is a progressive web app (`public/manifest.webmanifest`,
`public/sw.js`): once opened it plays offline and can be installed to a home screen or desktop.
Hashed build files are cached for good; the page itself is always fetched fresh when online, so a
new build is picked up at once. The leaderboard is never cached.

**When things go wrong.** A crash in the 3D view shows a Try again / Back panel instead of a blank
screen (`src/ui/CanvasErrorBoundary.tsx`). Errors are kept in a small log on the device (Settings,
Error log), which the player can copy into a bug report; nothing is ever sent. If the stored
progress cannot be read at start-up, it is copied to a backup key before a new save starts, and
the player is offered it as a download (`loadSaveChecked` in `src/game/save/saveManager.ts`).
Save format changes go through `SAVE_MIGRATIONS`, one step per version.

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
| 1 2 3 4 / C         | Choose which kind of Sproutling to throw / next kind |
| E                   | Knock, go down a way down, or come back up           |
| Tab (hold)          | Look at your idle Sproutlings                        |
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
| Kind button, kind chips  | Choose which kind of Sproutling to throw              |
| Fast-forward button      | Hold to hurry the day along                           |
| Two-finger pinch         | Zoom                                                  |

- **Sproutlings** are your workers, grown by the Kiln in four kinds (`src/game/workers/sprouts.ts`).
  Thrown next to a job, they start it by themselves. Idle ones (pale) pick up any work within a
  few steps. Only the selected kind is thrown: press 1 to 4, C, or tap a kind's chip.
  - **Emberlings** (red): fireproof, and hit hardest of the light kinds. Only they can work by a
    **flame vent**, which bursts on a beat after its ring glows.
  - **Dewlings** (blue): the only kind that wades. They fetch shards sunk in ponds, carry a haul
    straight across a river, and shrug off dew drips.
  - **Stonelings** (grey): slow, but lift like two and hit like three, and the only kind that
    cracks **crystal gates** at full strength (the rest manage a fifth).
  - **Sparklings** (yellow): quick and thrown farthest. Only they can work under a **spark
    coil**, whose pylons arc across the gap between them on a beat.
  - A **seed pod** grows its own kind (its colour shows which); anything else grows whichever
    kind made up most of the crew that carried it home. The Kiln never lets a kind of the day
    die out: if every Sproutling of a kind is lost, the next one it grows is of that kind.
  - Other kinds caught by a vent catch fire and run about; one that lands in water flounders.
    Either is lost after three seconds unless the whistle reaches it first.
  - The squad trusts the Warden: it follows into danger rather than dodging by itself. Lead it
    out of a charge lane or a slam ring, or lose it.
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
  - Every carcass hauled home becomes new Sproutlings (4, 7 and 3).
- **Bramble gates** block a path until enough Sproutlings break them; hauls behind a gate
  wait until it falls. **Dew drips** fall on the dark wet patches and knock carriers (but not Dewlings) off their
  haul. **Glowcaps** sprout partway through some days and wilt if left: extra score that never
  affects the rank.
- **Bosses** have a health bar across the top that says when they can be hurt. The Gravelmaw's
  plates take a quarter damage except while it lies winded after a slam; the Lanternroot is
  shielded while any root-knot glows; the Bellwether is armoured except after charging into
  stone. Off-duty Sproutlings scramble out of slam rings and charge lanes on their own; the
  squad does not.
- **More to carry and do**: **mounds** are dug up by idle Sproutlings and reveal a shard, pod or
  Sapdrop; **Span-logs** go to a riverbank, and enough of them build a bridge; **Sapdrops**
  speed every haul up by 40% for 30 seconds; **twin shards** (matching runes) earn a 50% bonus
  when both arrive within 10 seconds; **Dewglass** is worth more but cracks if its crew breaks
  up mid-haul; **Lodestones** crawl with a minimum crew and run with a triple one.
- **Reading danger**: a red disc shows where a bite will land, a "!" and a red line mark an enemy
  hunting something, an amber ring shows an enemy's hunting radius as the Warden approaches, a
  gauge fills before a shake, workers about to be hit flash white, and the minimap and red
  screen-edge arrows show threatened Sproutlings off screen.
- **Beacons** are cold until the Warden walks up to them. A lit beacon is a second drop-off:
  every haul goes to the Kiln or a lit beacon, whichever is the shorter walk, and Sproutlings
  from a pod hatch where the pod was delivered.
- **The Undercroft** is a dungeon: rock everywhere except its rooms and corridors, no daylight,
  and only the Warden's lantern and the beacons to see by. **Skitters** are weak cave vermin
  that hunt in packs and take one Sproutling per bite. **The Snuffer**, its boss, cannot be
  hurt in the dark at all: inside a lit beacon's glow it is armoured, and open while it lies
  winded after a slam. At two thirds and one third of its health it puts out the beacons
  around it and calls two Skitters; walk back to a beacon to relight it.
- **Proctor Ashwick** offers a line of advice now and then: the controls in the first lessons,
  and after that what you seem to be missing (idle Sproutlings, a winded boss, dazed workers
  about to be eaten). Settings can turn it off.
- **Terraces and ledges**: raised ground is ringed by cliffs. Sproutlings can be thrown up a cliff,
  but hauls, the Warden and walking Sproutlings use the stairs. A **ledge** (yellow chevrons) is a
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
- **Seed pods** are light hauls. One carrier takes a pod home, where it hatches into two new
  Sproutlings of its kind.
- You can throw over walls. Hauls cannot go over them, so they take the long way home.
- The day ends when every Sunshard is home, time runs out, the Warden is down, or no
  Sproutlings remain. Leftover time only scores if everything was collected.

## Ways to play

The main menu offers four: **Story**, **Time Attack**, **Challenges** and **Battles**
(`src/game/modes/modes.ts`).

**Story.** An open expedition in the spirit of the first game of the genre
(`src/game/campaign/`). The Great Clock over the Academy's gate has stopped and its twelve parts
are scattered over **the Wild Quad** (`src/game/campaign/sections.ts`), one big, full section of
the grounds: a lawn round the Kiln, a hedge garden behind a bramble gate, a lily pond, a river with
two bridges to build and a ford, and the old terraces beyond it with a crystal vault and a
Gravelmaw, plus 22 more relics, two dozen beasts, mounds, pods, Glowcaps and four beacons. There is
no order and no limit on days. Each day is a fixed length (nine minutes); plan it from the **base
camp**, which shows a map of the Quad, the Kiln's stock by kind and the Clock's parts.

- **Nothing is undone.** A finished day is settled into the save (`settleDay` in
  `src/game/campaign/campaign.ts`): relics brought home, beasts beaten, mounds dug, pods, Span-logs
  and Sapdrops used, gates broken, bridges built and beacons lit stay that way, and the next day's
  field is the section with all of that taken out (`dayField`). Work left half done is kept too:
  a gate's lost health and the Span-logs already laid at a bridge. A beast whose shard was left
  lying out is back the next day, shard and all; carcasses and dug-up pods left out rot overnight.
- **Sunset.** When the day ends (at sunset, or when you call it a day from the pause menu), every
  Sproutling in the squad, or within ten paces of the Kiln or a lit beacon, makes it home;
  everyone else is lost. The Headmaster calls sunset a minute before, and the HUD flashes. A
  story day can only be ended, never restarted or abandoned.
- **The Kiln's stock** carries over: up to the field's limit of 100 go out each morning, the rest
  wait. You start with ten Emberlings; Dewlings, Stonelings and Sparklings are found as seed pods
  in the Quad. An empty Kiln still coaxes out one Emberling.
- The parts are named relics of their own (`CLOCK_PARTS` in `src/game/story/relics.ts`).

**Time Attack.** The Academy's thirty numbered lessons in order (this was the story until
0.19.0), chosen on the illustrated map of the Academy grounds (`src/ui/StoryMap.tsx`,
`src/ui/academyMap.ts`): one region a term round the Academy, the trail winding through the
lessons, the Undercroft beneath the Academy, and caves appearing beside the lessons that lead
down to them once found. Bring every Sunshard home to clear a lesson and open the next. Every
Sunshard is timed against the same shard on your fastest clear, and the results show the clear
time against your best and the Academy's own pace (the lesson's Platinum time). Hard is a Time
Attack setting and opens on a lesson once it is cleared on Normal.

**Challenges.** Each challenge has **twelve fields of its own**, built for its rule
(`src/game/world/levels/challenges/`), for a medal (Bronze, Silver, Gold, Platinum, Diamond) and
a place on that field's Academy board. The first three fields of each are open; each one after
opens with a medal on the one before. Challenges are always played on the Normal day.

| Challenge         | Clock | Ends                      | Score                                                                                                                         | Fields built around                                     |
| ----------------- | ----- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Growing Season    | Yes   | At sunset                 | 1 per Sproutling alive at the end                                                                                             | Pods, mounds hiding pods, beasts to carry home          |
| Treasure Hunt     | Yes   | When every Sunshard is in | Treasure + 10 per Sproutling alive + 1 per 2 seconds left; a Perfect Bloom for bringing every Sunshard home and losing nobody | Twins, Dewglass, Lodestones, ponds, caches, shelves     |
| Mission           | Yes   | When everything is in     | Treasure + 50 per point of carcass weight; 10 per second left only on a 100% clear (every shard, every beast)                 | Herds, packs, guards and the great beasts               |
| Dandori Challenge | Yes   | When everything is in     | 10 per point of weight home; 1 per second left once everything is collected                                                   | Gates, bridges, beacons, ledges: jobs that unlock jobs  |
| Lean Squad Trial  | No    | When every Sunshard is in | 10 per point of Sunshard weight home; once every Sunshard is home, 50 per Sproutling alive. The Kiln grows nothing            | Hazards that punish the wrong kind, beasts on the prize |

Every field's Platinum is the Academy's test player's own result there, playing under that
challenge's rules (`ChallengeField.pace`): its finishing time for the timed challenges (Diamond
in 85% of it), its headcount at sunset for a Growing Season (Diamond about 15% more), and how
many Sproutlings it lost for a Trial (Diamond loses none). Bronze, Silver and Gold are 35%, 55%
and 75% of the Platinum score. In the Mission and the Dandori Challenge, Platinum and Diamond also
need everything collected; in the Trial, every Sunshard home. Glowcaps add to a score on a line of
their own but never count for a medal. `npm run paces` plays every field and prints what the test
player measured; tests check that it still makes each field's pace, that every field can reach
Diamond, and that every field is laid out soundly (`src/game/modes/modes.test.ts`,
`src/game/world/level.test.ts`). To see where the test player gets stuck on a field you are
building, run `VITE_DEBUG_LEVEL=<field id> npx vitest run src/game/modes/debugbot.report.test.ts --silent=false`.

Until 0.19.0 the challenges were played on the lessons. Those runs stay on the lessons' boards,
checked by the rules they were played under (`src/game/modes/paceTimes.ts`), closed to new runs.

**Battles.** Race a CPU rival who works their own copy of the same field at the same time; the
rival's field shows on a second map in the top left, and a race panel shows both tallies
(`src/game/modes/battle.ts`). Battle days are shorter (1.2 times the Platinum time at most).

- **Marble Race**: the four Sunshards farthest from the Kiln are marbles, ringed in gold. The
  first to bring all four home wins; at sunset, the most marbles home.
- **Bingo Race**: each side has its own 3 by 3 or 4 by 4 card of things to bring home
  (particular relics, any seed pod, any Glowcap, a beast of a kind). The first full row, column
  or diagonal wins; at sunset, the most squares.
- **Dandori Duel**: 10 points per point of weight home; the higher total wins at sunset, or as
  soon as either side has collected everything.

The rival is the test player, slowed to seven tenths of your pace (Cadet Pell), a little under
it (Warden Quill), or at full pace (Proctor Ashwick). Losing the Warden or the whole squad loses
the battle, and conceding from the pause menu counts as a loss. Wins, losses and draws are kept
per race.

**Twin pairs** are told apart at a glance: each pair in a lesson has its own colour, marker
shape and letter (A hexagon, B triangle, C square...), on the field, on the minimap and in the
briefing (`src/game/world/twins.ts`). Once the first half of a pair is home, the HUD counts down
the seconds left to bring the other half for the bonus.

## Lessons and progression

| #   | Lesson               | Teaches                                                    |
| --- | -------------------- | ---------------------------------------------------------- |
| 1   | Many Hands           | Staffing: give each haul exactly the carriers it needs     |
| 2   | Over the Wall        | Throwing over walls while hauls take the long way home     |
| 3   | The Guard            | Fighting a Mossback and growing the squad from its carcass |
| 4   | First Light          | Three lanes and three guards: choosing an order            |
| 5   | Long Haul            | A large field where the walk home dominates                |
| 6   | Divide and Conquer   | Dewlings, sunk shards; splitting the squad across jobs     |
| 7   | The Gauntlet         | Clearing a corridor of guards, then hauling through it     |
| 8   | Growing Pains        | Stonelings and a crystal vault; growing from carcasses     |
| 9   | Switchbacks          | Long zigzag hauls past walls you can throw over            |
| 10  | Final Exam           | Ten shards, six guards, walls everywhere                   |
| 11  | Bramble Gate         | Sparklings and spark coils; breaking bramble gates         |
| 12  | Drip Line            | Dewlings through the drips, a sunk shard                   |
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
lesson 19, 20 or 21. Standing on it records the find in the save; press E (or the button) to
take the squad down. The surface stops where it is, clock and all, until the Warden comes back
up the same stair (`src/game/simulation/expedition.ts`). Everyone below comes back up, including
Sproutlings grown down there; losses below count against the day, and if the Warden falls below
the day is over. Relics brought up go to the Field Guide but do not count towards the day's
score, so a cave is a detour for the collection, not a shortcut to a rank. A cave can be
revisited until it is emptied, and can also be played on its own from the Time Attack map.

The lessons are told as a story in four terms and an ending: Kindling (1 to 5, spring meadow),
Field Work (6 to 10, autumn), The Wild Marches (11 to 16, marsh), The Long Road (17 to 21,
dusk) and The Undercroft (22, a cave). Each setting has its own ground, trees, sky, weather and
music. Before a day, Proctor Ashwick gives a briefing; clearing a lesson in Time Attack adds
an entry to the Journal tab, and finishing a term adds a note from Tindle, the squad's first
Emberling. The text lives in `src/game/story/story.ts`.

**Required treasure and optional treasure.** Sunshards are required: every one must come home to
clear a lesson. Twin pairs (both halves home within 10 seconds of each other), Dewglass brought
home without cracking, and Glowcaps (which sprout partway through the day and wilt if left) are
optional. In the challenges they add to the treasure score; Glowcaps never count for a medal.
The briefing lists all of them, and the HUD counts Sunshards, bonus treasure and Glowcaps
separately.

Before 0.18.0 the lesson run (now Time Attack) was scored and ranked; those ranks are kept in old saves, count as
medals for the achievements, open Hard where they reached Gold, and mark lessons passed at Silver
or better as cleared. Their runs stay on the leaderboard's **Classic** board.

Each lesson's Platinum time (the Treasure Hunt's pace, and what sets a battle's day) is the clear time of the greedy test player in
`src/game/world/testBot.ts`, rounded up to the next second. That player knows every map perfectly,
throws the right kind at every job, and still loses Sproutlings and misses bonuses on the way,
so it ends about half the lessons on Gold and the rest on Platinum: Platinum means keeping its
pace and losing no more than it does, and Diamond means beating it clearly. `level.test.ts` requires the bot to clear every lesson within a second under its
Platinum time, to earn at least Gold and never Diamond, so the targets cannot drift slack or out
of reach. `npm run balance` plays every lesson on both
difficulties and rewrites [BALANCE.md](BALANCE.md) with clear times, losses and ranks; that table
is how the targets are checked whenever a lesson or a rule changes.

## Hard mode

The Time Attack map has a Normal / Hard switch. A lesson's Hard mode opens once it is cleared on
Normal in Time Attack, and keeps its own clears. On Hard (`src/game/core/difficulty.ts`):
enemies have 25% more health and wind up 15% faster, the Warden has two hearts, drips kill up
to three Sproutlings, each lost Sproutling costs 20 points instead of 10, and the day is 10%
shorter while the Platinum finish time stays the same. On Hard the greedy bot is only required
to bring home at least 80% of the shards, in one of up to three tries, each with a slightly
different style (how close it walks before throwing, how near it lets a beast come), the way a
person would try again.

## Leaderboard

The Leaderboard tab needs no server of its own, and posting is automatic
(`src/game/leaderboard/`):

- **Boards**: each challenge field has its own board (and the lessons keep their challenge runs from 0.18.0, closed). **Classic** keeps the runs from before
  0.18.0, when lesson days were scored, and takes no new ones. Story and Time Attack days and battles are not
  posted.
- **Your best runs**: the ten best days per challenge and lesson are kept in the save, each
  marked Posted, Posting or Not posted.
- **Posting**: when a day ends with a new personal best on a lesson, the game posts it by itself
  to a topic on [ntfy.sh](https://ntfy.sh), a free public message relay that browsers can post to
  and read from with no account. A post carries the run, your Warden name and a random player id
  made once per browser, and nothing else. If the relay cannot be reached the run waits in the
  save and is tried again later (after a minute, then longer, up to half an hour). The Warden
  name, and a switch to turn posting off, are on the Leaderboard tab.
- **Collecting**: the relay keeps messages for 12 hours. Every half hour a scheduled GitHub
  Action in this repository (`.github/workflows/leaderboard.yml`, which runs
  `npm run board:collect`) reads the topic, checks every run, and commits the best run per
  Warden per lesson to `leaderboard/board.json`.
- **Reading**: the board reads `leaderboard/board.json` from GitHub and whatever reached the relay
  in the last 12 hours, so a new run shows up at once and stays once collected.
- Every run is signed, and wherever it is read (in the game and in the Action) the signature is
  checked, every part of the score is recomputed from the lesson's own rules, the rank is checked
  against the score and the clock against the day, impossibly fast clears are refused, and a
  fingerprint of how the lesson plays is compared, so runs on a lesson whose layout has since
  changed are left off. The fingerprint leaves out the lesson's words and rank targets, so
  rewording a briefing or moving a rank never clears the board; runs from 0.17.0 are checked
  against that version's own fingerprint and rank rules, and stay. The signing key ships with the game, so this stops casual editing, not a determined
  cheat. Names are not verified. To strike a player off, add their player id (16 hex digits,
  the first four are shown as `#abcd` beside their name) to `leaderboard/banned.json`.
- Scheduled workflows only run on the default branch, so collecting starts once this is merged
  to `main`; until then (and if the Action is ever paused) runs still show from the relay for 12
  hours. GitHub pauses scheduled workflows in a repository with no activity for 60 days; re-enable
  it from the Actions tab if that happens.
- ntfy.sh limits how many messages one network can send a day. A player posts only personal
  bests, so this is far more than a player needs, but a run from a crowded shared network may
  wait until the next day.

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
- **Achievements**: 82, 79 of them on the list, covering lesson clears, the Great Clock, challenge medals, Perfect
  Bloom, battle wins (one for beating Proctor Ashwick), optional treasure, every kind's special
  jobs, caves, skill (flawless boss fights, photo finishes, chains, pacifist days) and the long
  totals, from First Delivery to Dandori Master (Platinum on thirty challenge fields), and a few that stay off the list until they are earned. Counter achievements show progress bars. New ones are announced on the results
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
    campaign/     the story's expedition: its sections, and each day settled into the next
    story/        chapters, briefings, journal text, relics and the in-day coach
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
   creatures. This project keeps the genre and mechanics but uses its own cast: Sproutlings
   (Emberlings, Dewlings, Stonelings and Sparklings), the Warden, the Kiln, Mossbacks and Sunshards. Folder names follow: `workers/` instead of
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
