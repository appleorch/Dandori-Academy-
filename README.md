# Dandori Academy

_The Grand Botanical & Clockwork Academy._

A browser RTS about dandori: planning work so that nobody stands idle. You lead a squad of
small workers, throw them at jobs, and move on while they finish on their own. The story is an
open expedition kept from day to day; Time Attack runs the Academy's lessons against the clock;
each challenge has twelve fields built for its own rules; battles race a rival Warden.

This repository implements the MVP defined in the project handoff document (one worker type,
one captain, one home base, one enemy type, one treasure type, throwing, whistling, carrying,
treasure delivery, a day timer and dandori scoring) plus the academy around it: twenty-five lessons
across four terms and the caves under the school, four bosses, an open story expedition, eighty-four challenge
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

**Languages.** The interface reads its text from message tables (`src/i18n/`): `t(key, params)`
for the interface (`src/i18n/en.ts` is the English source, grouped by screen, whole sentences
with `{placeholders}`), and `content(key, english)` for the game's own text kept with its data
(field names and briefs, mode rules, relic names, story sections; helpers in
`src/i18n/gameText.ts`). Settings has a Language choice. Besides English there is a
**pseudo-locale** for testing: it accents every letter, brackets every string and pads it by a
third, so untranslated text and clipped labels stand out; an end-to-end test switches to it and
fails on any plain English left on the converted screens, and a unit test scans their markup for
text written in directly. To add a language, add it to `LOCALES` with a message table for every
key and, optionally, a content table.

Every screen's markup is on the tables: its text, labels, tooltips, placeholders and the strings
it shows directly were moved by an AST codemod into `ui.<screen>.*` keys, and the markup scan
now covers every screen (only the developer's performance overlay stays in English). Still
English: strings put together in code away from the markup (a few status lines, the leaderboard's
time column, popups over the field), and the game text in `src/game/story/` (story pages, coach
and Headmaster lines, relic descriptions), achievement text and rank names.

**Art direction.** `docs-design/ART_DIRECTION.md` is the reference for the look: a garden seen at
insect scale (a Sproutling is about two centimetres tall), full of giant everyday objects. Walls can
be drawn as one of them (`look` per wall, or `wallLook` for a whole field: hedge, brick, flowerpot,
fence, book, tile, root, glass, gear), and `props` dress a field with giant objects the rules never
see (flowerpots, watering cans, trowels, teacups, pocket watches and more). Both are built from
instanced pieces (`src/game/rendering/kit.ts`, `KitMeshes.tsx`), so a field's whole kit costs a
handful of draw calls, and both are left out of a field's fingerprint, so dressing a field never
resets its leaderboard or changes a rule. Every standard material shares a soft three-band toon
ramp and a warm rim light (`src/game/rendering/toon.ts`); medium and high graphics add ink outlines
drawn from the scene's depth (`PostFx.tsx`). Many Hands, Over the Wall, Seedbed and Pod Orchard are
the dressed reference fields; before and after pictures are in `docs-design/art/`.

**The score.** The music (`src/game/audio/music.ts`) is written as scale-degree patterns and
played on a small instrument set (soft piano, pizzicato, harp, celesta, marimba, flute, clarinet,
upright bass, brushes) rendered in the browser into sample buffers at start-up
(`src/game/audio/instruments.ts`: plucked strings by Karplus-Strong, mallets and bells as
decaying partials, winds as shaped harmonics), so it downloads nothing; the old synth voices are
the fallback. Four leitmotifs (the Clock, Ashwick, Sprocket, the Sproutlings) are woven into
the area songs, one bar in eight, and the Clock's theme rings as a stinger for every part home;
the characters' motifs answer them when they speak. Every song has a morning, a working-day and a
sunset arrangement (`ARRANGEMENTS`), chosen by the day clock; intensity changes land on the bar
line. Music, effects, ambience and voices have buses of their own into a limiter, and the music
ducks under voices and big stingers.

**Sound in space.** Every sound with a place in the world is set there round the Warden with a
panner, fading with distance (`audio.setListener`); a few copies of one sound may ring at once,
but a threat's warning always gets through (`src/game/audio/spatial.ts`). Big hits have tails.
Every beast has a voice of its own (`CREATURE_VOICES`): an idle grumble, a call when it notices
you, a hurt yelp, a dying cry, and an attack tell whose shape is its own and loud enough to hear
off screen. Fields hum with ambient emitters placed from their own features: water burbles,
hedges rustle, drips drip, coils buzz, vents crackle. Buttons tick under the pointer, text boxes
click as you type, and achievements chime.

**The ground and the weather.** The field's ground blends three covers by a splat map painted once
per field (`src/game/rendering/ground.ts`): the setting's turf, bare soil worn along the paths from
the Kiln to each treasure and round the feet of walls and banks of water, and moss in the shade on
the north side of walls. Meadow, marsh and dusk fields are ringed by a border of giant grass blades
and flowers that sway in the wind (marsh fields add lily pads on the water); the foliage density
follows the graphics setting. Water has a shader of its own (`WaterAndBridges.tsx`): deeper colour
away from the banks, foam along the shore and rings round every wading Sproutling. In the story the
sun sets over the last 90 seconds of every day, when the squad must be gathered in, so the sky
itself is a warning (`SkyLight.tsx`). Mist creeps over marsh and dusk fields, and light slants
through the glass roof of the Terrarium (`Weather.tsx`). The miniature tilt-shift blur can be turned
off under Settings, Comfort.

## Play without installing anything

- **Browser**: https://dandori-academy.pages.dev (Cloudflare Pages), or on itch.io at
  https://sgtseamonkey.itch.io/dandori-academy.
- **Desktop**: Windows and Linux downloads on the itch.io page (Electron: the same game in its
  own window, using the fast GPU on laptops with two). F11 toggles full screen.
- `docs/` still holds a build for GitHub Pages (`npm run build:docs`).

The game draws on the player's own GPU. **Graphics: Auto** (the default) picks a level for the
device and, while playing, lowers the resolution and then the level if the frame rate drops, so
slower machines stay playable.

## Shipping

| Command                                  | What it does                                                        |
| ---------------------------------------- | ------------------------------------------------------------------- |
| `npm run deploy:web`                     | Builds and deploys the web game to Cloudflare Pages                 |
| `npm run deploy:board`                   | Deploys the leaderboard server (`worker/`) to Cloudflare Workers    |
| `npm run build:desktop -- win32 linux`   | Builds the desktop game into `release/`, one zip per platform       |
| `npm run deploy:itch`                    | Builds and uploads the web game to itch.io (`html5` channel)        |
| `node scripts/push-itch.mjs win32 linux` | Uploads the desktop builds to itch.io (`windows`, `linux` channels) |
| `npm run desktop`                        | Runs the desktop window against a fresh build, without packing it   |

`.github/workflows/deploy.yml` does all of it on every push to `main`, once two repository
secrets are set (Settings, Secrets and variables, Actions): `CLOUDFLARE_API_TOKEN` (Workers, D1
and Pages edit rights) and `BUTLER_API_KEY` (itch.io, Settings, API keys).

## 3D models

Characters can use glTF models: drop `warden.glb` into `src/assets/models/` and the Warden uses
it, animated by its `Idle`, `Walk` and `Run` clips; with no file, the built-in procedural model
is drawn. How to make and compress a model is in `src/assets/models/README.md`.

## How to play

Every key, mouse button and gamepad button can be rebound in Settings, under Controls (two keys
or mouse buttons and one pad button per action; see `src/game/commands/bindings.ts`). These are
the defaults:

| Keyboard and mouse   | Gamepad           | Action                                               |
| -------------------- | ----------------- | ---------------------------------------------------- |
| WASD / arrows        | Left stick        | Move the Warden                                      |
| Mouse pointer        | Right stick       | Aim the cursor (sticks snap onto nearby jobs)        |
| Left mouse (hold)    | RT (hold)         | Throw squad members at the cursor                    |
| Right mouse / Space  | LT (hold)         | Whistle: call every worker in the circle back to you |
| F / middle mouse     | A                 | Charge: send the whole squad running to the cursor   |
| Q                    | B                 | Dismiss the squad                                    |
| C / X                | RB / LB           | Next / previous kind of Sproutling to throw          |
| 1 2 3 4              |                   | Choose a kind of Sproutling directly                 |
| E                    | X                 | Knock, go down a way down, or come back up           |
| Shift (hold)         | View (hold)       | Fast-forward the day at three times speed            |
| Tab (hold)           | D-pad left (hold) | Look at your idle Sproutlings                        |
| V                    | Y                 | Tactical view over the whole course                  |
| Mouse wheel, = and - | D-pad up / down   | Zoom                                                 |
| Esc / P              | Menu              | Pause (resume, restart with R, settings, quit)       |
| F3                   |                   | Performance overlay (see Run it)                     |

Esc and the pad's Menu button always pause, whatever else is bound. In the menus, Tab and
Shift+Tab move between buttons and Esc goes back; on a pad the D-pad or left stick moves, A
chooses and B goes back. While a pad is in use, prompts on screen (Pause, Begin the day, Go
down) show its buttons, and Proctor Ashwick's tips name the controls you actually have.

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
  few steps. Only the selected kind is thrown: press 1 to 4, C or X (RB or LB), or tap a kind's
  chip. Each kind has its own head shape as well as its colour, so they can be told apart
  without colour: a flame tuft, a droplet, a square cap and a zig-zag bolt, with the same
  shapes on the HUD.
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
- **Bosses are set pieces.** The first time a boss is roused on a field, the day waits for a
  three-second intro (a camera swoop, its name and title, a roar and a sting; click, whistle or
  the interact key skips it), shown once per field per save (`bossIntros`). Every boss fights in
  three phases, marked on its health bar: the Gravelmaw throws pebbles after its slams, then
  burrows and comes up under the crowd; the Lanternroot spits in pairs, then sprouts Bogspitters
  and regrows its knots sooner; the Bellwether charges twice, then stomps; the Snuffer puts out
  beacons and calls Skitters. Two new bosses have Mission fields of their own: **the Galewing**
  (The High Wind) circles out of walking reach and dives on a ring it marks, then lies open on
  the ground, and **the Mire Lord** (The Mire) swims, spits waves of pond water that only
  Dewlings swim through, and later rears a wave round itself. Each boss drops a named relic of
  its own (`BOSS_RELICS`), its music is played in its own key and quickens with each phase, and
  the boss lessons' arenas are dressed with the art kit.
- **Beasts with a rule of their own** (`src/game/enemies/beasts.ts`), each asking a new question:
  the **Pollen Moth** flies out of walking reach (only throws hit it) and carries Sproutlings
  off unless hit hard enough to let go; the **Burrow Grub** moves unseen under a ripple and
  erupts under moving hauls, surfacing after a strike or for air; the **Shellback Beetle** is
  armoured until two Stoneling hits (or four from anyone) flip it; the **Sleeper Slug** is
  harmless until noise wakes it, a moment later, so one volley can finish it asleep; the **Pike
  Newt** hunts only in and beside water; the **Thornback Hedgehog**'s spines kill whoever clings
  on unless it is curled (winded after a charge, or knocked by a Stoneling); the **Mimic Cap**
  passes for a Glowcap but twitches and bites whoever comes close; the **Spark Wasp Nest** sends
  wasps whose stings spare Sparklings. Each is in two challenge fields and all eight are in the Wild
  Quad; the Field Guide has a note on every beast.
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
- **Plucking.** Each morning the squad waits in the ground round the Kiln as sprouts, and new
  Sproutlings come up the same way; the Warden plucks them by hand with the interact key (E, or X
  on a pad), and holding it sweeps through a whole patch. The whistle calls, it does not pluck.
- **Growing.** Every Sproutling grows from leaf to bud to bloom: by living through days (bud after
  two, bloom after four) or a stage at once by drinking a Dewdrop, the nectar that grows on a few
  plants in the Quad every morning and drops from beaten beasts. Buds walk and carry 15% faster,
  blooms 30%, and wear a pink bud or a flower on their head-sprout. Growth is kept per Sproutling
  in the save (`growth` in `CampaignState`, most grown going out first), and saves from before it
  load with everyone a leaf. Plucking and growing are the story's alone (`SimOptions.story`,
  `src/game/workers/growth.ts`): everywhere paces are measured, every Sproutling is a leaf and
  hatches on its feet, so no target or leaderboard moved.
- **Losses** show how they happened (`src/game/rendering/Fallen.tsx`, from `Simulation.fallen`):
  burned to ash, sinking, jolted by a spark, or flattened; each releases a spirit in its kind's
  colour. Butterflies on outdoor fields are chased by idle Sproutlings (`Butterflies.tsx`).
- The parts are named relics of their own (`CLOCK_PARTS` in `src/game/story/relics.ts`).
- **The Sunken Orchard** (`src/game/campaign/orchard.ts`), the second section (220 × 160,
  marsh), opens with six parts home. An old orchard half drowned by a burst cistern, where
  Dewlings are the stars: the landing meadow and its first loop; the Crate Yard (a giant fallen
  apple crate, its bramble door and a hidden store behind a weak board, with flooded drains
  behind); Watering Can Island in a ring of water, with two bridges to build; and the Root
  Hollow, whose great tree's roots are the way down into the Root Cellar, and from it further
  down to the Sunken Cistern (a part on each floor; caves may have ways down of their own), with the Mire Lord's pond and the last part beyond. Ten parts (two need the Quad's
  gifts: the bridge kit and the lantern), 29 other relics, 26 beasts and mounds including the
  Pike Newt, Pollen Moth, Sleeper Slug, Thornback, Mimic Cap, Shellback and a wasp nest, and
  Glowcaps, Sapdrops, Dewdrops, drips and four beacons. Treasure found in a section's caves
  counts for the section (`settleDay`'s cave finds), and caves keep what was taken from them
  (`caveField`). Pictures of each zone are in `docs-design/art/orchard-*.jpg`.
- **The Clockwork Foundry** (`foundry.ts`, 200 × 200, dusk) opens with 14 parts home: the forge
  where the Clock was cast, Emberlings' ground. Flame vents everywhere, crystal gates, three
  tiers (the casting floor, the pattern loft on a terrace above it, the tower top on a terrace
  on the loft, with ramps up and ledges down), and **conveyor belts** (`conveyors` in a level,
  `src/game/world/conveyorSystem.ts`) that carry hauls and Sproutlings on foot the way they run:
  the long belt home helps, the contrary one by the east furnace does not. The Galewing roosts
  on the tower top over the last part.
- **The Frostglass Observatory** (`observatory.ts`, 240 × 160, terrarium) opens with 22 parts
  home: Sparklings' ground, with spark coils across the glass halls, Lodestones and the hardest
  beasts, and **the telescope** (`telescope` in a level): looked through with the interact key,
  it shows three relics no one could see before, and the story remembers it was used. Under the
  dome the **Hollow Warden**, the final boss: in each of its four phases only one kind truly
  hurts it (Stonelings, Emberlings, Dewlings, then Sparklings; the boss bar says which), and its
  slams leave the hazard only that kind can stand.
- **Characters and scenes.** `docs-design/STORY_BIBLE.md` sets out the cast and their arcs:
  the silent Warden, Proctor Ashwick on the radio, Headmaster Sprocket (whose secret is why the
  Clock stopped), Tindle the first Emberling, and Warden Quill, met in the Foundry. Short scenes
  (`src/game/story/scenes.ts`) play in the world at the story's beats, each once per save: the
  first morning, each section's first day, and each part's return to the Kiln. The day waits;
  the camera looks where each line says; a click moves on, Skip ends it. Characters speak in
  blips pitched to each voice (`audio.speak`), as do the Headmaster's banner remarks and
  Ashwick's tips. At every sunset the Warden writes a log entry from the day
  (`src/game/story/wardenLog.ts`), collected in the Journal. Field Guide entries for beasts open
  once each has been beaten, and every boss has a note from the Warden and one from Sprocket.
- **The finale.** The whole story is 42 parts over four sections. When an ending is reached the
  base camp shows the Great Clock in the courtyard (`EndingScreen.tsx`), going or still, with the
  ending's words and the credits; every section stays open afterwards for everything left.
- **Sections.** The story is built for several sections of the grounds (`CAMPAIGN_SECTIONS`).
  Each keeps its own record (what is done, worn, home and seen); the one being explored is held
  at the top of `CampaignState`, the others in `others`, and the base camp lists them all: a
  section opens once enough parts are home from anywhere (`opensAt`). Saves from before keep
  their progress as the Wild Quad's.
- **The Clock's gifts** (`src/game/campaign/upgrades.ts`). Each of the first seven parts home
  grants a lasting ability, announced on the day it comes home and listed at the base camp: the
  Chime of Finding (parts still out show on the map), a longer whistle, a quicker Kiln, faster
  carrying, a wider safe ring at sunset, logs that count twice at bridges, and a lantern for
  caves. Some parts cannot be reached without a gift (`needs`); the map marks them, and they are
  left out of the field until then: two in the Quad need the lantern and the bridge kit.
- **The second Warden** is the Clock's eighth gift. They start by the Kiln; H switches between
  the two (the camera and the controls go to the other, who stands where they were left with
  their own squad), G sends half the squad over, and walking up to the other Warden merges both
  squads. Each Sproutling knows its Warden (`party`); with one Warden, which is every day outside
  the story, nothing about it changes anything.
- **Sprays.** Berry bushes grow in every section; a berry carried home is brewed at once into a
  spray, kept from day to day: Emberbrew (B: for 20 seconds the squad walks a third faster and
  strikes half as hard again) and Stillwater (N: every beast near the Warden freezes for 8
  seconds). The HUD shows them in hand.
- **The Kiln's plan.** At the base camp, choose how many of each kind go out tomorrow; the rest
  wait. A graph shows the Kiln's stock day by day.
- **The first hour.** A new story's first day is a guided morning (`story/guide.ts`): a white
  fence (`LAWN_FENCE`, gates of style `fence` that nothing can break) closes the Kiln's lawn,
  and one prompt at a time, each waiting for the action, teaches walking, plucking, throwing,
  carrying home, whistling and seed pods, then the Clock part on the lawn; once it is home the
  fence opens (`Simulation.openFence`). Returning players can skip it at the base camp or from
  the prompt. The first of each new kind carried in gets a short scene and something to try. On
  the first day Ashwick warns of sunset three minutes out, the safe rings round the Kiln and lit
  beacons light up (`SafeRings`), and nobody is lost that night. From the third day the base
  camp suggests where to sharpen your dandori, by what the last days showed most: idle hands,
  losses or slow hauls (`advice.ts`, from `CampaignState.form`).
- **Story difficulty**, chosen before the first day and kept with the story: Relaxed (no day
  limit; at sunset only idle Sproutlings far from safety are lost), Normal, and Hard (tougher
  beasts and Warden as in Time Attack's Hard, a smaller safe ring, and following the Warden is
  no protection). The old "relaxed story" setting is moved over into it.
- **Exploration and secrets.** Every section hides a glade behind a cracked stretch of wall
  (a `hidden` gate, last in its list so saved stories keep every other gate's place) with a
  relic found nowhere else (`SECRET_RELICS`). The base camp map shows parts seen through the fog,
  takes up to 12 pins with a click (`CampaignState.pins`), and lists each section's completion
  (its treasures and beasts, `sectionCompletion`); a section completed earns its outfit. Hold M
  in play for a big map.
- **Stakes** (`endings.ts`). The Clock should strike for the first day of term, 30 days in; the
  base camp counts down. Every part home in time is the golden ending; every part home late is
  another; the limit passing with parts still out is a third, after which the story goes on.
  "Relaxed story" in the settings turns the limit off.
- **Fog of war** (`fog.ts`). The base camp map and the minimap show only ground the Warden has
  seen, kept per section in the save as a small bitset.

**Time Attack.** The Academy's thirty numbered lessons in order (this was the story until
0.19.0), chosen on the illustrated map of the Academy grounds (`src/ui/StoryMap.tsx`,
`src/ui/academyMap.ts`): one region a term round the Academy, the trail winding through the
lessons, the Undercroft beneath the Academy, and caves appearing beside the lessons that lead
down to them once found. Bring every Sunshard home to clear a lesson and open the next. Every
Sunshard is timed against the same shard on your fastest clear, and the results show the clear
time against your best and the Academy's own pace (the lesson's Platinum time). Hard is a Time
Attack setting and opens on a lesson once it is cleared on Normal.

Every clear earns a **time medal** (Diamond and Platinum by the lesson's own times, Gold within a
quarter over Platinum, Silver within 60%, Bronze otherwise), shown as the badge on its map node,
and the map adds up the **Academy time** over every lesson cleared. The fastest clear's path is
kept (`ghosts` in the save, a few kilobytes) and walked again beside you as a pale **ghost**
(Settings: Ghost runs). R restarts at once, even mid-day, and a restart of the same lesson skips
the briefing. Results show a **split table**: each Sunshard today against the fastest clear
before. The simulation is deterministic, and a day's inputs, packed by run length
(`encodeInputs` in `src/game/modes/timeAttack.ts`), replay it to the same clear time exactly
(tested), ready for verified boards. The lessons are dressed for their settings (art only).

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

**The design pass** (0.45.0, `levels/challenges/rework.ts`), applied alike to every hand-built
field: one smaller than 3,600 square units grows evenly, up to 1.3 times each way (every place
and wall's size; its day is written in its file); a field that scores treasure gets a Glowcap on
the farthest open ground from the Kiln, sprouting a quarter of the way into the day; and each
challenge's fields are ordered by how hard the test player found them (time for the timed ones,
losses then weight for the Trial, size for the Growing Season). Fields with vents or coils, and
four whose trick hangs on exact distances (`AS_LAID_OUT`), are kept as laid out.

Every challenge field is dressed for its setting: fields written without dressing of their own
get their setting's walls and a giant object at each corner and side (`dressField` in
`src/game/world/levels/challenges/field.ts`), art only, so no board ever resets for it.
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

## Menus, HUD and results

- **Title and menus.** The game opens on a title (the Academy courtyard at dusk, the Great Clock
  turning, Sproutlings milling about) that waits for any key, click, tap or pad button. The main
  menu has four big choices (Story, Time Attack, Challenges, Battles) and a row of Extras
  (Journal, Field Guide, Leaderboard, Achievements, Wardrobe, Settings, Credits). Every other
  screen has a back button (Escape, or B) and tabs across its own group.
- **Design system** (`ui.css`): one type scale, spacing scale, radii and focus ring, as CSS custom
  properties on `:root`; screens slide in, overlays fade. Reduced motion stills it all.
- **HUD.** Only the essentials stay up: the field, the clock, what the day counts, health and
  pause. Working and field counts, bonus treasure and Glowcaps sit in a panel behind **More**.
  The story's clock is a dial with the sunset minute marked in red. Off-screen markers count idle
  Sproutlings at the screen edge, beside the red arrows for those in danger. On a pad, hold
  D-pad right for the **kind wheel** and point the right stick; on a keyboard, hold Z and lean
  the mouse.
- **Results.** Tallies count up, a medal drops in for Time Attack clears, challenges and
  battles, and two small charts show Sproutlings on the field and treasure home over the day
  (`Simulation.timeline`, every five seconds). **Share a card** makes a picture of the result
  with the field and the medal (the share sheet where there is one, else a download).
- **Manual and tips.** Pause → Manual has an illustrated page for every mechanic (`manual.ts`);
  loading screens show a tip.

Before and after: `docs-design/art/ui-*-before.jpg` and `ui-*-after.jpg`.

## Long-term play

- **The daily challenge** (top of the Challenges screen). A Treasure Hunt field made fresh each
  day from the UTC date by the field kit's generator (`world/generator.ts`: a seeded layout of
  wall pieces, rocks, a pond, shards, pods and beasts from templates). Before it is offered the
  test player plays it through in the browser (about a second); a field it cannot finish is
  thrown away and the next seed tried, and its time becomes the field's pace, medals and day
  (`world/daily.ts`). Every player gets the same field, registered by id at run time, so it has
  its own board; the board's collection makes each posted day's field the same way. The slow
  suite checks two months of dailies.
- **Escort**, a sixth challenge: one crawling Lodestone relic at the far end of a long field,
  beasts waiting on the way and ambush waves arriving during the day (`ambushes`, spawned by the
  simulation on time), scored like a Treasure Hunt. Its twelve fields are made by the same
  generator from fixed seeds, with paces measured by the test player.
- **Relics**: 150 in all, with eight themed sets of eight (`story/relicSets.ts`) found in the
  Escort fields and the daily fields. The Field Guide shows each set's progress; a completed set
  earns its outfit.
- **Wardrobe**: twenty more outfits (one per relic set and twelve across every way to play), with
  new hat shapes (top hat, cap, crown, beret, hood) and capes on the Warden.
- **Photo mode** (from pause): a free camera (WASD or drag, Q/E to turn, the wheel to zoom), no
  HUD, filters, a tilt-shift depth of field and Sproutlings cheering for the camera; _Save
  picture_ bakes the filter and blur into a PNG.
- **Achievements**: forty-one more over the new content, four of them secret.
- **Secrets in every section**: three buried relics under mounds with a faint sparkle (a
  treasure marked `buried` starts under a mound and comes up when it is dug), and a high ledge
  in a corner (`cornerLedge` in course.ts: a low terrace with a high top on it, only drops back
  down) that only a thrown Sparkling reaches. The Observatory's halls have drops (`pit` walls)
  crossed by glass floors.
- **Notes**: every Clock part and boss relic has the Warden's and the Headmaster's notes in the
  Field Guide (`story/relicNotes.ts`).
- **Practice from here** (Time Attack results): start at the moment any Sunshard came home on
  your fastest clear, replayed up to there; practice runs are never kept.
- **Arena pillars**: gates of style `pillar` that only a charging beast can crack, two charges
  each (the Bellwether's arena).
- **Sprays on challenge fields**: a field may grant sprays (`items`); the last two Escort fields
  do. Using one is noted in the replay.
- **Expedition** (a seventh challenge): no clock, a small field with a way down at its far end,
  and two or three floors of caves beneath it (`floors` on the field), each with a Kiln by the
  foot of its stair and, but the last, a way down of its own. Deeper floors hold heavier
  Sunshards and fiercer beasts. What is found below counts with the field's own once it comes up
  the stair (`Expedition.pooled`); the day ends when every floor is emptied. Score: treasure plus
  20 a Sproutling alive at the end; Platinum is the test player's headcount and needs every floor
  emptied. Its twelve fields are made by `generateDive` from fixed seeds and dived to the bottom
  by the test player (`world/diveBot.ts`: the greedy player on each floor, down the stairs once a
  floor's own Sunshards are home, and back up once everything below is emptied).

## Playing together

- **Local co-op** (the story and the challenges; the switch is on the base camp and the
  challenges screen). A second player on a gamepad (the last one plugged in; the first player
  keeps the keyboard and mouse, and the first pad if there are two) gets a Warden of their own
  and half the squad. Each simulation step runs the Warden phase (walk, aim, whistle, throw,
  orders) once for each player, swapping the two Wardens' state in between
  (`Simulation.swapSides`), so it stays deterministic; the world then steps once. The camera
  frames both, drawing back as they part; once they are more than 30 units apart the screen
  splits in two, a camera on each Warden (`camera/SplitScreen.tsx`). Co-op days are recorded with
  the second player's inputs (`DayLog.partner`) and replay exactly; co-op runs go on co-op boards
  of their own (`RunEntry.coop`, a Solo/Co-op switch on the leaderboard). Beasts go for either
  Warden, and a blow landing by the second player's hurts them.
- **Online battles** (Marble Race, Bingo Race and Dandori Duel; _Play online_ on the Battles
  screen). One player hosts and reads out a six-letter room code; the other joins with it. The
  two browsers are introduced through the same public relay the board uses (one offer and one
  answer, with every network candidate gathered first) and then talk directly over a WebRTC data
  channel, found through a free public STUN server: there is no game server. Both browsers run
  both fields in lockstep (`net/lockstep.ts`): each side's input is decided six steps (about a
  tenth of a second) ahead and sent at once, a step is played only when both inputs for it are
  there, and every second each side sends a hash of both fields, so a desync is noticed and
  shown. The guest plays the second bingo card, so both agree on whose is whose. If the two
  cannot connect directly (some networks block it), the screen says so; if one leaves, the other
  is told.

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

The board never resets. It lives on a small server: a Cloudflare Worker over a D1 database
(`worker/`, `https://dandori-board.dandori-academy.workers.dev`), free on Cloudflare's plan.

- **Boards**: each challenge field has its own board (and the lessons keep their challenge runs from 0.18.0, closed). **Classic** keeps the runs from before
  0.18.0, when lesson days were scored, and takes no new ones. **Time Attack** has a board per
  lesson and difficulty, ranked by clear time (`mode: 'lessons'`, score 0, the rank the medal the
  time earned), checked against the lesson's clock and medal times and verified by replaying its
  log. Co-op runs have boards of their own. Story days and battles are not posted.
- **Your best runs**: the ten best days per challenge and lesson are kept in the save, each
  marked Posted, Posting or Not posted.
- **Posting**: when a day ends with a new personal best on a lesson, the game posts it by itself
  to the server (`POST /runs`), and with its replay log to the relay as well, for verification. A post carries the run, your Warden name and a random player id
  made once per browser, and nothing else. The server keeps each player's best run per board,
  lesson and difficulty. If it cannot be reached, the run goes to the old public relay
  ([ntfy.sh](https://ntfy.sh), kept 12 hours), which the server collects every half hour; if
  neither can be reached the run waits in the save and is tried again later.
- **Reading**: the board reads `GET /board`. If the server is away it falls back to
  `leaderboard/board.json` plus the relay. That file is a backup of the server's board, written
  every half hour by a scheduled GitHub Action (`.github/workflows/leaderboard.yml`, `npm run
board:collect`), which also carries relay runs to the server.
- Every run is signed, and wherever it is read (on the server, in the game and in the Action)
  the signature is checked, every part of the score is recomputed from the lesson's own rules,
  the rank is checked against the score and the clock against the day, impossibly fast clears
  are refused, and a fingerprint of how the lesson plays is compared, so runs on a lesson whose
  layout has since changed are left off. The fingerprint leaves out the lesson's words and rank
  targets, so rewording a briefing or moving a rank never clears the board; runs from 0.17.0 are
  checked against that version's own fingerprint and rank rules, and stay. The signing key ships
  with the game, so this stops casual editing, not a determined cheat. Names are not verified.
- **Striking a player off**: their player id is 16 hex digits (the first four are shown as
  `#abcd` beside their name). Ban them on the server with
  `npx wrangler d1 execute dandori-board --remote --config worker/wrangler.toml --command
"INSERT INTO banned (player) VALUES ('<id>')"`, and add the id to `leaderboard/banned.json`
  for the backup file.
- Free-plan limits (100,000 requests and 5 million database rows read a day) are far above what
  the board needs: the board is cached at the edge for 30 seconds.
- **Replays and verification** (`src/game/replay/`). The simulation is deterministic, so a day is
  decided by its field, its mode and its inputs. Every Time Attack and challenge day is recorded:
  each step's input, on a fixed grid the game itself plays on (cursor to a twentieth of a unit,
  stick to a hundredth), packed as runs of identical steps with the cursor as small changes and
  then deflated (`inputLog.ts`), plus the few things outside the input (going down a stair and
  back up, ending the day early). The last day and the best day on each field are kept in this
  browser's IndexedDB. A posted run signs the SHA-256 of its log, and the log rides beside it on
  the relay (ntfy.sh keeps a long message as a file, which the board fetches). The Action first
  runs the arithmetic checks above, then replays every run that brought its log, in Node, with the
  same build, and drops any whose replay does not give exactly the result claimed; runs that
  pass are listed as verified in `board.json` and show a ✓. The best three replays of each board
  are kept in `leaderboard/logs/<hash>.json`, for watching and racing. Runs without a log (from
  before 0.38.0) keep their arithmetic checks only, unmarked.
- **Version safety.** A log carries `SIM_VERSION` (`replay.ts`) and the run its field's
  fingerprint. Bump `SIM_VERSION` with any change that could make an old log play differently
  (rules, physics, a field). Logs only replay, and runs only verify, on the version they were
  recorded on: older runs stay on the board as they were verified (verified once, kept so), and
  their replays stop being offered. To keep an old version's replays watchable, the Action
  could check out that version's tagged build to replay them; we retire them instead, and a
  field whose layout changes gets a fresh board through its fingerprint, as before.
- **Watching and racing.** The results screen has _Watch the replay_; the Leaderboard tab has
  _Watch your best run_, and _Watch_ and _Race_ on board runs whose replay is kept. The viewer
  plays from a quarter speed to eight times, with a timeline to scrub, and a camera that follows
  the Warden or roams free (WASD or drag, the wheel zooms). Seeking back replays from the start,
  headless, up to the chosen moment (a few seconds at most), rather than keeping snapshots. _Race_
  replays the run here to get its Warden's path and sets it as the ghost on your next day on that
  field, in Time Attack or a challenge.
- Scheduled workflows only run on the default branch. GitHub pauses scheduled workflows in a
  repository with no activity for 60 days; re-enable it from the Actions tab if that happens.

## Settings, save files and achievements

- **Sync to a file** (Settings, Chromium browsers): choose a file once and every change to the
  save is written to it a moment later, through the File System Access API
  (`save/fileSync.ts`). After a reload the browser asks once before writing again.

- **Settings** (main menu, or the pause menu during a day): graphics level, carrier counts,
  enemy health bars, pause when the window loses focus, advice from Ashwick, briefings, sound
  and music volume, and zoom speed. They apply immediately and
  are remembered per browser.
- **Accessibility and comfort** (in Settings): colour palettes for red-green and blue-yellow
  colour blindness (they recolour the kinds, attack warning rings and medal colours; a test
  simulates both kinds of colour blindness and keeps every pair far apart,
  `src/game/rendering/palette.test.ts`), text and menu size from 90% to 150%, reduced motion
  (no camera shake, punch or freeze-frames, calmer bursts, no pulsing menus; on by default
  when the system asks for less motion), a high-contrast HUD, whistle and fast-forward that
  toggle instead of being held, a throw arc that always shows, and aim assist for sticks.
- **Controls** (in Settings): every action with two keyboard or mouse slots and a gamepad
  button. Choose a slot and press the new key or button; Esc cancels and Backspace clears. A
  key already used elsewhere is moved, not shared, and the page says what lost it.
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
    commands/     input state, the input controller (keyboard, mouse, gamepad, touch),
                  rebindable bindings and stick aim assist
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
  squarehollow/   what is behind the back room's other door: a block world, loaded on demand
  ui/             menus, HUD, briefing, journal, pause, results, achievements, settings
                  (with rebinding) and gamepad menu navigation
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
