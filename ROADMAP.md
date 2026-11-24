# Dandori Academy: AAA review and roadmap

A critique of the game as of 0.19.0, written as a series of self-contained work orders. Each
**chunk** below is meant to be copied whole into a new Claude Code session on this repository.
Each one is sized to fit comfortably in one session (roughly 60% of the context), states what to
read first, and ends with what "done" means, so it can be checked.

**How to use it**

1. Do the chunks roughly in order: the early ones are foundations the later ones build on
   (performance before more content, the section framework before new sections, the art kit
   before the art pass on every field).
2. Paste one chunk per session. Each one ends with: run `npm run typecheck`, `npm run lint`,
   `npm test` (or the subset named), commit, and push.
3. After a chunk that adds or moves level content, run `npm run paces` (challenge fields) or
   `npm run balance` (lessons) as the chunk says, so medal targets stay honest.

---

## The verdict in one page

**What is already strong.** The core loop is right: throw, whistle, carry, plan. The simulation is
deterministic, fixed-step and fully tested, which is the rarest and most valuable thing in this
codebase: it makes replays, ghosts, lockstep multiplayer and verified leaderboards cheap. Four
Sproutling kinds with clear jobs, readable telegraphs, a test player that measures every field,
a persistent open story, five challenge rules with sixty purpose-built fields, battles against a
rival, and a working serverless leaderboard are already more systems than most indie games ship.

**What keeps it from AAA.** It does not yet _look_, _sound_ or _feel_ like a premium product, and
it does not yet have the _volume_ or _authorship_ of one.

- **Art.** Every model is built from spheres, capsules and boxes at runtime. Walls are grey boxes,
  terrain is flat apart from box terraces, and nothing says "a tiny world". The genre's signature
  (a garden seen at insect scale, full of giant everyday objects) is absent: a Mossback in a box
  maze reads as a prototype.
- **Characters.** Sproutlings have a charming rig but no growth stages, no plucking, no voices,
  no death spirit, no personality animations. Creatures are geometric and few (eight beasts and
  four bosses) with one behaviour loop each.
- **Audio.** The music is a clever step sequencer of synthesised voices. It is in key and adaptive
  in a basic way, but it sounds like a chiptune demo next to the orchestral, place-specific scores
  of the genre. There are no voices and no leitmotifs, and the mix is not spatial.
- **Story.** The narrative is text on panels. There are no cutscenes, no daily log, no character
  arcs that play out in the world, and only one story section; the open story is finished in a
  few days.
- **Level design.** Fields are hand-placed coordinates in rectangles. They are sound and tested,
  but they lack landmarks, sightlines, golden paths, secrets, and a "signature moment" each. The
  story section shows every part on the map from day one, which removes discovery.
- **Feel and access.** No gamepad, no rebinding, no colour-blind support, no text scaling. The
  camera is fixed-angle with no cinematic moments, and the bundle is a single 6 MB file.
- **Scale.** One story section, thirty lessons and sixty small challenge fields are enough for a
  demo. A full release in this genre has five or more story areas, caves, 20+ creature types,
  dozens of bosses and set pieces, and 15 to 30 hours of content.

The chunks below fix these in an order that keeps the game shippable after every one.

---

## Chunk 1: Performance and loading foundations

```
You are working on Dandori Academy (React 19 + react-three-fiber + Rapier, Vite). Before we add
a lot more content and art, make the game fast to load and fast to run.

Read first: vite.config.ts, src/App.tsx, src/game/rendering/GameCanvas.tsx,
src/game/rendering/Scenery.tsx, src/game/rendering/EnemyMeshes.tsx,
src/game/rendering/WorkerInstances.tsx, src/game/simulation/physics.ts, package.json.

Facts: `npm run build` produces one ~6 MB JS file (docs/assets/index-*.js). Rapier's WASM, the
poker room and every menu screen are in it. Enemies and scenery are individual meshes; workers
are already instanced.

Tasks:
1. Code-split: lazy-load the poker room (src/poker), the leaderboard screen, the field guide,
   achievements and settings screens with React.lazy + Suspense, and load Rapier's WASM only when
   a day starts. Add a tasteful loading state (the Kiln glowing) that never flashes for fast loads.
   Configure manualChunks/codeSplitting so three.js, react and rapier are separate cacheable chunks.
2. Measure: add a dev-only frame-time overlay (toggle with F3) showing FPS, frame ms, draw calls,
   triangles and simulation step ms, read from renderer.info and the GameLoop.
3. Instance what repeats: scenery (trees, rocks, grass tufts, flowers) and enemy parts that repeat
   (Skitters, legs, eyes) should use InstancedMesh like WorkerInstances does. Target: the largest
   fields (Restoration Day, the Wild Quad, Masterwork) under 300 draw calls on "high".
4. Automatic quality: on first run, time the first 120 frames and pick low/medium/high
   (src/game/core/settings.ts already has `graphics`); never lower a setting the player chose.
5. Add a performance smoke test in Vitest that builds the Wild Quad's simulation with 100 workers
   and asserts 600 simulation steps finish under a budget (pick a generous number from a real run
   so it catches regressions, not noise).

Done when: the initial JS before a day starts is under 1.5 MB gzipped, the F3 overlay works, the
largest fields hold their draw-call target, and typecheck, lint and tests pass. Update README's
"Run it" section with the F3 overlay. Commit and push.
```

---

## Chunk 2: Controls, gamepad and accessibility

```
You are working on Dandori Academy. Make it playable and comfortable for everyone, on every input.

Read first: src/game/commands/input.ts, src/ui/TouchControls.tsx, src/game/core/settings.ts,
src/ui/SettingsPanel.tsx, src/ui/Controls.tsx, src/ui/Hud.tsx, src/ui/ui.css,
src/game/rendering/WorkerInstances.tsx (kind colours).

Facts: keys are hard-coded in input.ts (KeyQ, KeyF, KeyE, KeyC, KeyV...). There is no gamepad
support, no rebinding, and the four Sproutling kinds are told apart by colour only.

Tasks:
1. Gamepad: add a Gamepad API source to InputController. Left stick moves, right stick aims the
   cursor relative to the Warden (reuse `aimOffset`), RT throws, LT whistles (hold to grow), A
   charge, B dismiss, X interact, LB/RB cycle kind, Y tactical view, Start pause, View
   fast-forward. Add aim assist for sticks that snaps the cursor toward the nearest job within a
   small cone. Show controller glyphs in Controls.tsx and the HUD when a pad is the last input.
2. Rebinding: a Controls page in settings that lists every action with its key and pad button,
   lets the player rebind (capture next key), detects conflicts, and saves to settings.
3. Colour-blind support: give each kind a distinct silhouette cue as well as colour (ember:
   flame tuft, dew: droplet head, stone: square cap, spark: zig-zag antenna) in WorkerInstances,
   and matching glyphs on the HUD kind chips and roster. Add three palettes (default,
   deuteranopia, tritanopia) as a setting that recolours kinds, hazard rings and ranks.
4. Comfort settings: UI scale (90 to 150%), reduced motion (no camera shake, punch or hit-stop,
   calmer particles), high-contrast HUD, hold-vs-toggle for whistle and fast-forward, and an
   option to show the throw arc always.
5. Screen reader and focus: every menu reachable by keyboard and pad with visible focus; the
   results and briefing panels have proper headings and live regions.

Done when: the whole game is playable start to finish on a pad, every action is rebindable, kinds
are distinguishable in greyscale (check with a screenshot through a greyscale filter), and tests
pass (add input tests for the gamepad mapping and rebinding in src/game/commands/input.test.ts).
Update the README controls tables. Commit and push.
```

---

## Chunk 3: Art direction bible and the miniature-world kit

```
You are working on Dandori Academy. The single biggest gap to AAA is the look: everything is
primitive shapes and walls are grey boxes. The genre's signature is a garden seen at insect scale,
full of giant everyday objects. Set the direction and build the kit every later art chunk uses.

Read first: src/game/rendering/theme.ts, Architecture.tsx, Scenery.tsx, Terrain.tsx, textures.ts,
rocks.ts, src/game/world/levelTypes.ts (Wall, WallLook), src/game/world/course.ts.

Tasks:
1. Write docs-design/ART_DIRECTION.md (not docs/, which is the build output): the scale (a
   Sproutling is 2 cm tall; the Warden is a thumb-sized clockwork figure), the palette per
   setting, the shading model (soft toon ramp with painted gradients and rim light), the
   silhouette rules for creatures, what "giant everyday object" means for each setting (meadow:
   flowerpots, garden gloves, watering cans, croquet hoops; autumn: acorn caps, conkers, a rake;
   marsh: lily pads, a lost boot, a rusted lantern; dusk: candles, a sundial, pocket watches;
   terrarium: glass panes, plant labels, brass instruments; cave: roots, bottles, coins).
2. Extend WallLook with object looks (e.g. 'flowerpot', 'brick', 'book', 'tile', 'root', 'glass',
   'gear', 'hedge', 'fence') and build a procedural mesh for each in Architecture.tsx, sized to
   the wall box so rules are unchanged. Hedges get leaf cards; bricks get mortar; books get spines.
3. Landmark props: a `props` array on LevelDefinition for non-blocking giant objects placed for
   art only (a teacup, a trowel, a fallen clock face), rendered with instancing where repeated.
   They never change rules: the test that checks layouts must ignore them.
4. A shared toon material (onBeforeCompile on MeshStandardMaterial, or a small custom shader)
   with a 3-step ramp, painted rim light and a subtle outline pass, used by walls, props,
   creatures and Sproutlings. Keep a "low" path without outlines.
5. Re-skin one lesson (1. Many Hands) and one challenge field (Growing 1. Seedbed) fully with the
   kit as the reference look, and capture before/after screenshots at deviceScaleFactor 2 into
   docs-design/.

Done when: the art bible exists, the new wall looks and props work in any level, the two reference
fields look like a miniature garden rather than a prototype, nothing about the rules changed (all
tests pass, `npm run balance` table unchanged), and frame time on "high" is within 10% of before.
Commit and push.
```

---

## Chunk 4: Terrain, water, foliage and lighting pass

```
You are working on Dandori Academy, following docs-design/ART_DIRECTION.md (from the art chunk).
Make the ground, water, plants and light worthy of the new kit.

Read first: src/game/rendering/Terrain.tsx, WaterAndBridges.tsx, Scenery.tsx, SkyLight.tsx,
Atmosphere.tsx, PostFx.tsx, ParticleField.tsx, src/game/world/heightMap.ts.

Tasks:
1. Terrain: blend at least three ground materials (grass, soil, stone/moss) by a splat map
   computed from the level (paths worn between Kiln and treasures, soil near walls, moss in
   shade). Add gentle cosmetic height noise that never changes the rules (heightAt for gameplay
   stays as is; only the render mesh gets the extra noise, kept below 0.15 units).
2. Foliage: GPU-instanced grass blades and flowers with wind sway (vertex shader), bending away
   from the Warden and Sproutlings walking through. Density scales with the graphics setting.
3. Water: a stylised water shader with depth tint, foam at banks and bridges, ripples where
   Dewlings wade and where things splash, and floating lily pads in the marsh.
4. Light: time of day driven by the day clock (SkyLight already reads timeLeft). Morning gold,
   noon, and a long orange sunset in the story's last 90 seconds with long shadows, then blue
   dusk. Caves keep their own lantern light. Add a tilt-shift depth-of-field option in PostFx
   to sell the miniature scale (off on low).
5. Weather per setting: drifting seeds (meadow), falling leaves (autumn), mist and fireflies
   (marsh), dust motes in light shafts (terrarium), drips glinting (cave).

Done when: the reference fields from the art chunk plus the Wild Quad look finished at all three
graphics levels, the sunset is unmistakable in the story, frame time on "high" stays within the
chunk-1 targets, and all tests pass. Screenshots before/after in docs-design/. Commit and push.
```

---

## Chunk 5: Sproutling character pass (growth, plucking, voices, death)

```
You are working on Dandori Academy. Make the Sproutlings the stars: tactile, alive and loved.

Read first: src/game/workers/sprouts.ts, workerSystem.ts, squad.ts,
src/game/rendering/WorkerInstances.tsx, src/game/kiln/kilnSystem.ts, src/game/carry/carrySystem.ts,
src/game/audio/audioManager.ts, src/game/simulation/components.ts.

Tasks:
1. Growth stages: leaf, bud, bloom. A Sproutling grows a stage by drinking a Dewdrop nectar (a new
   small pickup that drops from beaten beasts and grows on some plants) or by staying alive across
   story days (bud after 2 days, bloom after 4). Bud is 15% faster, bloom 30% faster in walking
   and carrying, and the head ornament changes. Store stage in Worker and in the story's Kiln stock
   (stock becomes kind x stage counts; migrate old saves to leaf). Rules change, so re-run
   `npm run paces` and `npm run balance` and update targets if the bot's times move.
2. Plucking: in the story, new Sproutlings are planted around the Kiln as sprouts in the ground;
   the Warden plucks them with the interact key (hold to pluck in a sweep). Challenges and Time
   Attack keep instant hatching so measured paces stay valid.
3. Voices: a procedural chirp voice per kind (pitched formant blips, ember bright, stone low,
   dew bubbly, spark buzzy) for thrown, landed, lifting, "heave-ho" chants while carrying
   (synchronised across the crew), alarm when grabbed, and a soft death cry. Rate-limit and mix so
   a hundred never become noise.
4. Death and rescue: a lost Sproutling releases a small rising spirit with its kind's colour and a
   bell tone, visible from the camera. Burning, drowning and electrocution get distinct
   animations; whistled rescues get a relieved hop.
5. Personality: idle fidgets (look around, sit, chase a butterfly, wave at the Warden), a cheer
   when a haul arrives, a cower when a beast roars nearby.

Done when: all of the above work, the instanced rig still costs about the same draw calls, saves
from 0.19 load with all Sproutlings at leaf stage, tests pass (add tests for growth and the stock
migration), and paces/balance are re-measured if they moved. Changelog entry. Commit and push.
```

---

## Chunk 6: Creature roster expansion (eight new beasts)

```
You are working on Dandori Academy. Eight beasts and four bosses is a demo roster; the genre
ships 20+ creature types. Add eight beasts that each ask a new question of the player.

Read first: src/game/enemies/enemyKinds.ts, enemySystem.ts, combat.ts,
src/game/rendering/EnemyMeshes.tsx, src/game/world/testBot.ts, src/game/story/relics.ts (for
tone), src/ui/FieldGuide.tsx.

Add (names are suggestions; keep the house style of names):
1. Pollen Moth: flies, cannot be reached by walking Sproutlings, only thrown ones; swoops and
   lifts a Sproutling away; drop it by hitting the moth.
2. Burrow Grub: hidden underground, shown by a ripple; erupts under carriers. Teaches watching the
   ground and routing hauls.
3. Shellback Beetle: armoured on top; flips onto its back when hit by a charge or a Stoneling
   volley, then is open from below.
4. Sleeper Slug: asleep and harmless until noise (the whistle, a nearby fight) wakes it; best
   beaten asleep in one volley.
5. Pike Newt: a water predator that only hunts in and beside water; Dewlings can fight it there.
6. Thornback Hedgehog: hurts whatever latches on unless it is curled; stun it first.
7. Mimic Cap: looks like a Glowcap until carried, then bites. Readable with a subtle tell.
8. Spark Wasp nest: a static nest that sends wasps until broken; Sparklings are immune.
For each: spec in ENEMY_SPECS with clear telegraphs, a mesh in EnemyMeshes (in the art bible's
style), sounds, a carcass with weight and yield, Field Guide entry text, and test-player handling
in testBot.ts so fields containing it remain measurable.

Then place each new beast in at least two existing challenge fields where it fits the field's
idea, and three in the Wild Quad. Re-run `npm run paces` and update paces with the patch script
approach in the README; keep every field clearable by the test player.

Done when: eight new beasts exist with unique mechanics, tests cover each one's core behaviour
(src/game/simulation/combat.test.ts style), all fields still pass their pace tests, and the
Field Guide shows them. Changelog. Commit and push.
```

---

## Chunk 7: Boss design pass and arenas

```
You are working on Dandori Academy. Bosses (Gravelmaw, Lanternroot, Bellwether, Snuffer) work but
are single-loop and fought in plain rectangles. Make each a set piece.

Read first: src/game/enemies/enemySystem.ts, enemyKinds.ts, combat.ts,
src/game/rendering/EnemyMeshes.tsx, src/game/camera/CameraRig.tsx, src/game/audio/music.ts
(the 'boss' track), the boss lessons in src/game/world/levels/wildMarches.ts and depths.ts.

Tasks:
1. Intros: when a boss is first roused, a 3-second in-engine intro (camera swoop, name card,
   roar, music sting). Skippable, shown once per field per save.
2. Phases: give each boss three phases with a new attack or arena change each (e.g. Gravelmaw
   burrows and resurfaces in phase 2 and calls rock falls in phase 3; Bellwether rings to stun in
   a ring; Lanternroot regrows knots faster and spits seeds that sprout hazards). The health bar
   shows phase segments.
3. Arenas: rebuild each boss lesson's arena with the art kit so the fight's rules are visible in
   the space (pillars that crumble after two charges, a dark arena with beacons as islands).
4. Rewards: each boss drops a unique named relic with a model and description.
5. Boss music: per-boss variations with phase transitions in music.ts (intensity layers already
   exist; add a phase layer).
6. Two new bosses for the story sections to come (one aerial, one in water), specced in
   enemyKinds.ts and placed in a new Mission challenge field each.

Done when: every boss has an intro, three phases and a distinct arena; the test player still
clears every boss field (update lesson Platinum times with `npm run balance` and challenge paces
with `npm run paces` where they moved); tests pass. Changelog. Commit and push.
```

---

## Chunk 8: Story framework: sections, Clock upgrades and stakes

```
You are working on Dandori Academy. The open story (src/game/campaign/) has one section, no
stakes and no reason to return to earlier ground. Build the framework a full campaign needs.

Read first: src/game/campaign/campaign.ts, sections.ts, campaign.test.ts, src/ui/CampScreen.tsx,
src/game/core/gameStore.ts (finishDay), src/game/save/saveManager.ts, README "Ways to play".

Tasks:
1. Multiple sections: CampaignState tracks state per section (done, wear, parts) and which
   sections are open. The base camp gets a world map to pick today's section. Migrate 0.19 saves
   (their state becomes the Wild Quad's).
2. Clock upgrades: each Great Clock part restored grants a lasting ability, shown on the base
   camp and announced when it comes home. Suggested set: radar (missing parts show on the map
   only once this part is home; until then the map shows explored ground only), a longer
   whistle, a second Warden to switch to (see the systems chunk), a faster Kiln, carrying
   speed, Sproutlings surviving sunset within a larger radius, a bridge kit (logs count double),
   a lantern that lights caves.
3. Gating: a section opens when enough parts are home (Quad 6 parts opens section 2, and so on),
   and some parts in earlier sections are only reachable with a later ability (Metroidvania
   return trips), marked on the map as "you'll need something else".
4. Stakes: a soft day limit for the whole campaign (e.g. 30 days) with three endings by parts
   and days, told in the ending screens (best ending: every part within the limit). Show days
   left at the base camp. The limit can be turned off in settings ("Relaxed").
5. Fog of war: the base camp and in-day minimap show only explored ground (cells the Warden has
   seen within a radius, saved per section as a compact bitset).

Done when: the framework supports N sections with saves migrated, abilities work and persist,
gating and fog work, endings are reachable (test with a synthetic CampaignState), and tests pass
(extend campaign.test.ts). The Wild Quad remains fully playable. Changelog. Commit and push.
```

---

## Chunk 9: Story section 2: The Sunken Orchard

```
You are working on Dandori Academy, after the story framework chunk. Build the second story
section, as full as the Wild Quad or fuller.

Read first: src/game/campaign/sections.ts (the Wild Quad), course.ts (terraces), levelTypes.ts,
docs-design/ART_DIRECTION.md, src/game/campaign/campaign.test.ts.

Section: The Sunken Orchard, an old fruit orchard half flooded by a burst cistern, marsh theme.
Size about 220 x 160. Ten Great Clock parts and at least 25 other relics.
Design requirements:
- A clear landing site and a readable first loop (the first 3 minutes teach the area).
- Three zones with a landmark each visible from far away (a giant fallen apple crate, a sunken
  watering can island, a tree whose roots form a cave mouth), linked so the area folds back on
  itself (shortcuts that open: a gate, a bridge, a log ramp).
- Water everywhere: Dewlings are the star; at least four parts need Dewlings, one needs Dewlings
  and a bridge.
- Two parts behind abilities from the Quad's parts (return trips later).
- A cave entrance into a two-floor cave (use the descent mechanic) with two parts below.
- At least 20 beasts including three of the new beasts from the creature chunk, and the new water
  boss guarding the final part.
- Hidden treasure: three buried relics with a subtle sparkle cue, one secret area behind a
  breakable wall.
- Glowcaps, Sapdrops, Dewdrop nectar, 3+ beacons, drips, mounds.
Write it as a LevelSpec in sections.ts with named relics for the parts in relics.ts, add the
cave as a side LevelSpec, and extend campaign tests (layout walkable, parts count, fullness).
Run the greedy test player over five story days in a test and require steady progress.

Done when: the section is playable from the world map once unlocked, every spawn is valid, the
test player makes progress over five days, and screenshots of each zone are in docs-design/.
Changelog. Commit and push.
```

---

## Chunk 10: Story sections 3 and 4, finale and ending

```
You are working on Dandori Academy, after section 2. Build the last two story sections and the
finale. If this is too large for one session, do section 3 now and section 4 plus the finale in
the next session with the same instructions.

Section 3: The Clockwork Foundry (dusk theme, about 200 x 200). Furnaces, conveyor belts that
move hauls (a new conveyor tile: a box that pushes anything on it in a direction), flame vents
everywhere (Emberlings' section), crystal gates, a vertical layout of three terrace tiers with
ledges, ten parts, the aerial boss.

Section 4: The Frostglass Observatory (terrarium theme, about 240 x 160). Glass floors over
drops, spark-coil machinery (Sparklings' section), a telescope that reveals hidden relics when
aimed (a set piece), Lodestones, the hardest beasts, ten parts, and the final boss: the
Clockwork Warden-turned-wrong, a multi-phase fight that uses every kind.

Finale: when every part is home, an in-engine ending: the Great Clock rebuilt in the Academy
courtyard, camera pull-back over all four sections, the three endings from the framework chunk,
a credits roll, and a post-game where every section stays open for 100%.

Done when: both sections pass the layout and fullness tests, the test player makes progress on
each, the finale plays for each ending (testable from a synthetic save), and the README lists the
whole campaign. Changelog. Commit and push.
```

---

## Chunk 11: Narrative, characters and in-engine scenes

```
You are working on Dandori Academy. The story is text on panels. Bring the characters into the
world and give the player a reason to care.

Read first: src/game/story/story.ts, coach.ts, headmaster.ts, relics.ts, src/ui/StoryScreen.tsx,
src/ui/Briefing.tsx, src/ui/JournalScreen.tsx, src/ui/Portrait.tsx, src/game/camera/CameraRig.tsx.

Tasks:
1. A scene system: short in-engine scenes scripted as data (camera moves, characters walking,
   speech bubbles with portraits, waits), skippable, played at story beats: the first morning,
   each part's return (the Clock gaining a piece in the courtyard), each section's opening, each
   boss, the endings.
2. Characters with arcs, written in a STORY_BIBLE.md: the Warden (silent, but chosen), Proctor
   Ashwick (strict mentor who retires at the end of Time Attack; in the story, the voice on the
   radio who slowly admits pride), Headmaster Sprocket (comic, but the Clock was his
   responsibility: a secret about why it stopped), Tindle (the first Emberling, who follows the
   Warden into the story and grows to bloom), a rival Warden (Quill, from the battles) met in
   section 3. Write dialogue for every beat; keep the house tone (dry, warm, British).
3. The Warden's log: at the end of each story day, a journal entry generated from what happened
   (parts found, beasts beaten, losses, firsts) with a handwritten-style panel; the Journal tab
   collects them.
4. Relic and creature notes: every part and boss gets two notes, the Warden's and Sprocket's (as
   the genre's treasure logs do). Every creature gets a Field Guide entry with behaviour notes
   unlocked by beating it.
5. Barks: short spoken-text lines (with the voice blips from the Sproutling chunk, pitched per
   character) when things happen, replacing some of Sprocket's banner lines.

Done when: scenes play at every beat, the bible exists and the dialogue reads consistently, the
log writes a sensible entry for any day (unit test with a few synthetic reports), and tests pass.
Changelog. Commit and push.
```

---

## Chunk 12: Music overhaul

```
You are working on Dandori Academy. The music (src/game/audio/music.ts) is a synthesised step
sequencer with nine songs and intensity layers. Make it a score.

Read first: src/game/audio/music.ts, audioManager.ts, src/game/rendering/GameLoop.tsx (mood),
src/App.tsx (which track plays when).

Tasks:
1. Better instruments without large downloads: a small sample-based instrument set (a soft piano,
   pizzicato strings, flute, clarinet, harp, celesta, marimba, upright bass, brushed kit) as short
   compressed samples (OGG, under 1.5 MB total, lazy-loaded after the first menu), with the
   current synth voices as the fallback. Keep music data as scale-degree patterns.
2. Leitmotifs: write a Clock theme (used on the menu, the base camp and every part's return), an
   Ashwick motif, a Sprocket motif and a Sproutling motif, and weave them into the area songs.
3. Areas and day phases: each setting gets a morning, a working-day and a sunset arrangement of
   its song; the story crossfades by the day clock and adds a ticking clock layer in the last 60
   seconds. Caves get their own sparse variants.
4. Stingers and transitions: bar-quantised transitions between intensities, a stinger for a part
   coming home, for a boss intro, for a medal, and short jingles for results by rank.
5. Mixing: a proper bus structure (music, ambience, SFX, voices) with ducking of music under
   voices and big stingers, and a limiter on the master.

Done when: every area has three phase arrangements, the motifs are recognisable, transitions never
clash, the downloaded audio stays under budget, and nothing breaks with Web Audio unavailable
(tests stub it). Changelog. Commit and push.
```

---

## Chunk 13: Sound design and spatial audio

```
You are working on Dandori Academy. Make the world sound alive and readable without looking.

Read first: src/game/audio/audioManager.ts, src/game/rendering/feedback.ts, GameLoop.tsx.

Tasks:
1. Spatial audio: use PannerNodes with distance attenuation relative to the camera's ground focus,
   not only stereo pan; cap simultaneous voices per sound with priority (threats first).
2. Layered SFX: every important sound in three layers (transient, body, tail) with random pitch
   and sample variation so repeats never sound identical. Rework throw, land, carry chant,
   delivery, bite, charge wind-up, slam, glob, burn, zap, drip, gate break, bridge.
3. Creature voices: idle, alert, attack tell, hurt and death sounds for every beast and boss;
   the attack tell must be audible off screen and distinct per beast (a player should be able to
   dodge a Ramhorn by ear).
4. Ambience beds per setting with positional emitters (a stream, wind in a hedge, a dripping
   cave, buzzing coils, crackling vents) placed from level data automatically.
5. UI sound pass: hover, select, back, error, unlock, medal, typing in the Warden name.

Done when: a blind playtest of a Mission field lets you tell where threats are by ear, repeated
sounds vary, ambience follows level features, and tests pass. Changelog. Commit and push.
```

---

## Chunk 14: Challenge level design pass

```
You are working on Dandori Academy. The sixty challenge fields (src/game/world/levels/challenges/)
are sound but plain: rectangles with hand-placed coordinates. Give each one authorship.

Read first: the five files in src/game/world/levels/challenges/, field.ts, the README challenge
section, src/game/modes/modes.ts, docs-design/ART_DIRECTION.md, and run
`VITE_PACES=1 npx vitest run src/game/modes/challengePace.report.test.ts --silent=false` to see
current measurements.

For every field (do one challenge per session if needed; start with Lean Squad Trial and Mission):
1. Signature moment: one memorable thing per field (a Ramhorn charging down a hedge corridor into
   a flowerpot, a twin pair on opposite sides of a ticking sundial, a Trial shard balanced on a
   vent between two coils). Write it in the brief.
2. Readability: a landmark per region, sightlines from the Kiln to the main goals, a golden path
   that a first-time player finds, and props from the art kit dressing every wall.
3. Risk and reward: optional high-value treasure in harder spots; Glowcaps placed to tempt a
   detour that costs pace.
4. Difficulty curve: order the twelve fields by measured difficulty (bot losses, time per weight)
   so each challenge ramps; the first three teach, 4 to 9 combine, 10 to 12 test mastery.
5. Variety audit: no two fields in a challenge share a layout idea; grow small fields (several are
   60 x 40) so a day takes three to eight minutes.
Keep every field measurable: after edits, run `npm run paces` and update `pace`/`dayLength` with
the README's method, and keep the layout tests green.

Done when: every field in the chosen challenges has a signature moment in its brief, landmarks
and props, a sensible ramp, and passes all tests with updated paces. Changelog. Commit and push.
```

---

## Chunk 15: Time Attack lessons remaster

```
You are working on Dandori Academy. The thirty lessons (Time Attack) are the training ground.
Make them a polished, replayable time-attack mode.

Read first: src/game/world/levels/*.ts (kindling, fieldWork, wildMarches, longRoad, depths,
curriculum), src/ui/StoryMap.tsx, src/ui/ResultsScreen.tsx (StoryBody), BALANCE.md,
src/game/world/testBot.ts.

Tasks:
1. Ghosts: record the player's inputs for their fastest clear per lesson (the simulation is
   deterministic: input logs reproduce a day exactly) and replay the Warden as a translucent ghost
   on later attempts, with a toggle. Store compactly (run-length encoded inputs) in the save.
2. Medals for time: Bronze to Diamond by clear time (Platinum = the existing platinumTime,
   Diamond = diamondTime), shown on the map nodes and results; a total "Academy time" across all
   lessons.
3. Instant restart (R) with no briefing after the first attempt, a split table on results (each
   Sunshard vs best), and a "practice from here" option that starts a lesson with the Warden at
   any delivered shard's moment from the best run (via the input log).
4. Art pass using the kit on all thirty lessons (dressing only; never move rule geometry, so
   `npm run balance` stays unchanged).
5. Online: post best clear times (with the input log) to the existing board so they can be
   verified by replaying them in the GitHub Action (see the replay verification chunk).

Done when: ghosts, time medals, splits and instant restart work, the lessons are dressed, the
balance table is unchanged, and tests pass (add tests that a recorded input log replays to the
same clear time). Changelog. Commit and push.
```

---

## Chunk 16: Systems depth: second Warden, items and the Kiln

```
You are working on Dandori Academy. Add the mid-game systems that give the genre its depth.

Read first: src/game/simulation/Simulation.ts, captain/captainSystem.ts, workers/squad.ts,
commands/input.ts, src/game/campaign/campaign.ts, rendering/CaptainMesh.tsx, ui/Hud.tsx.

Tasks:
1. Second Warden (story and new challenge fields only): two Wardens, switch with a key/button;
   the other one stands still or walks to a point you marked, with their own squad. Split and
   merge squads. Unlocked in the story by a Clock part. Make the simulation support N captains
   (default 1 keeps every existing field and its paces unchanged; tests prove it).
2. Items: two consumable sprays brewed from berries carried home: Emberbrew (the squad attacks
   faster and walks faster for 20 s) and Stillwater (freezes nearby beasts for 8 s). Story only,
   plus two challenge fields that grant a fixed number.
3. Kiln management in the story: at the base camp choose how many of each kind and stage go out
   today (the field cap is 100), and see the Kiln's history graph.
4. Squad control: sort the squad by kind with one input, throw the nearest of the selected kind
   (already) or "any" mode, and a formation hint when the squad is large.
5. The test player learns to use the second Warden on fields that need it (keep it simple:
   park one Warden by a far job), so new fields remain measurable.

Done when: one-Warden fields behave exactly as before (paces and balance unchanged), the story
unlocks the second Warden and items, the base camp manages the party, and tests pass. Changelog.
Commit and push.
```

---

## Chunk 17: Exploration, secrets and the base camp map

```
You are working on Dandori Academy. Discovery is the heart of the genre's story mode and is
currently missing: every part is visible on the map from day one.

Read first: src/ui/CampScreen.tsx, src/game/rendering/Minimap.tsx, src/game/campaign/campaign.ts,
src/game/campaign/sections.ts, src/game/rendering/Beacons.tsx.

Tasks (skip any the story framework chunk already did):
1. Explored ground saved per section; the base camp map and the in-day minimap show only explored
   ground, with fog at the edges and landmarks revealed from afar when seen.
2. Parts are hidden until seen in the field or until the radar part is home; seen-but-not-home
   parts get a pin. The player can place their own pins on the base camp map.
3. Secrets per section: buried relics with a faint sparkle every few seconds, a breakable wall
   with a crack decal, a high ledge reached only by throwing a Sparkling, and a hidden glade
   with a unique relic.
4. A full-screen in-day map (hold M / pad View) with pins, beacons, the Warden, the squad, idle
   Sproutlings and the sun's progress.
5. Rewards for 100%: per-section completion percent, a cosmetic for each section's 100%.

Done when: a new save shows almost nothing on the base camp map, the map fills as you explore,
secrets exist in every section, the full-screen map works, and tests pass. Changelog. Commit and
push.
```

---

## Chunk 18: UI and UX overhaul

```
You are working on Dandori Academy. The menus are functional web panels with a row of nine tabs.
Make the front end feel like a console game.

Read first: src/ui/MainMenu.tsx, MenuNav.tsx, Hud.tsx, ResultsScreen.tsx, Briefing.tsx,
SquadRoster.tsx, ui.css, src/App.tsx.

Tasks:
1. A title screen: animated 3D scene behind the logo (the Academy courtyard and the Clock, the
   Sproutlings milling), "press any key", then a main menu of four big choices (Story, Time
   Attack, Challenges, Battles) and a small Extras menu (Journal, Field Guide, Leaderboard,
   Achievements, Wardrobe, Settings). Retire the nine-tab bar from the front page.
2. A consistent design system in ui.css: type scale, spacing, panel styles, focus states,
   transitions between screens (slide/fade), pad navigation everywhere.
3. HUD: reduce chips to essentials by context, move secondary info into a collapsible panel, add
   a radial or wheel kind selector for pads, a clear sunset/clock dial in the story, and
   off-screen markers for idle Sproutlings and threatened crews.
4. Results: animated stat tallies with graphs (Sproutlings over the day, deliveries over time),
   a medal ceremony, and share-a-card (image of the result with the field name and medal).
5. Loading tips and an in-game manual (illustrated) for every mechanic, reachable from pause.

Done when: the title flow, extras menu, design system, HUD and results changes are in, every
screen works with keyboard, pad and touch, and tests pass. Before/after screenshots in
docs-design/. Changelog. Commit and push.
```

---

## Chunk 19: Onboarding and the first hour

```
You are working on Dandori Academy. A new player now lands on "Begin the story", which drops them
into a 200 x 140 open map with ten Emberlings and text rules. Design the first hour.

Read first: src/game/story/coach.ts, src/ui/Briefing.tsx, src/game/campaign/sections.ts,
src/game/campaign/campaign.ts, the first five lessons in src/game/world/levels/kindling.ts.

Tasks:
1. Story day 1 is a guided morning: a fenced landing lawn (opened at the end of the tutorial)
   teaching move, throw, whistle, carry and the Kiln with prompts that wait for the action,
   then the first part, then the gate opens to the rest of the Quad. Skippable for returning
   players.
2. Teach each new kind where it is found in the story (a short scene and a small safe puzzle
   when the first pod of a kind is carried home).
3. Teach sunset on day 1 with a gentle warning at 3 minutes left, a demonstration of the safe
   radius, and the first night with no losses guaranteed.
4. Point players from the story to Time Attack ("sharpen your dandori") and challenges after
   day 3, with the right recommendation for their weak spot (idle time, losses, slow carries).
5. Difficulty for the story: Relaxed (no day limit, sunset only loses idle Sproutlings far away),
   Normal, and Hard (fewer Sproutlings survive, beasts tougher). Saved per story.

Done when: a playtester who has never played reaches the first part in under five minutes
without reading anything long, every kind has its intro, the difficulty choice works, and tests
pass (story tests for difficulty rules). Changelog. Commit and push.
```

---

## Chunk 20: Replays, ghosts and verified leaderboards

```
You are working on Dandori Academy. The simulation is deterministic: the same inputs always give
the same day. Use that to make the leaderboard trustworthy and to add replays.

Read first: src/game/simulation/Simulation.ts, src/game/commands/input.ts (InputState),
src/game/leaderboard/runCode.ts, board.ts, scripts/collect-board.ts,
.github/workflows/leaderboard.yml, src/game/simulation/stress.test.ts (determinism).

Tasks:
1. Input recording: record each step's InputState compactly (only changes, run-length encoded,
   quantised cursor) for every day. Keep the best run's log per field in the save.
2. Replay viewer: watch any saved run with free camera, speed controls (0.25x to 8x) and a
   timeline scrubber (snapshots every 10 seconds of simulation for seeking).
3. Verification: posted runs include the input log; collect-board replays each one in Node with
   the same build and rejects runs whose replayed result differs from the claim. Keep the
   current arithmetic checks as a fast first pass.
4. Ghost races: download the top run for a field and race its ghost (Time Attack and timed
   challenges).
5. Version safety: a run records the game version and field fingerprint; replays only verify
   against the same simulation version (document how to keep old versions verifiable or retire
   their boards).

Done when: any day can be replayed exactly (test: record a test-player day, replay it, compare
stats), the viewer works, collect-board verifies by replay, ghosts work, and tests pass. README
leaderboard section updated. Changelog. Commit and push.
```

---

## Chunk 21: Multiplayer: co-op and live battles

```
You are working on Dandori Academy, after the replays chunk. Add play with other people.

Read first: src/game/modes/battle.ts, the replay/input-log code, src/game/simulation/Simulation.ts,
src/App.tsx, src/ui/BattleSelect.tsx.

Tasks:
1. Local co-op: two Wardens on one field (builds on the second-Warden support), shared screen
   with a camera that frames both (and splits when they part), on keyboard plus pad or two pads.
   Co-op is offered in the story and on challenge fields (separate boards for co-op).
2. Online battles: lockstep over WebRTC data channels (with a free public STUN server; no game
   server), exchanging only inputs per step with a small input delay and a desync check (hash of
   the simulation state every second). Signalling by sharing a room code through the same public
   relay the leaderboard uses. Fall back gracefully if a peer cannot connect.
3. Battles get online versions of Marble Race, Bingo Race and Dandori Duel.

Done when: local co-op works in the story and challenges, two browsers can play a battle online
with matching results (test the lockstep core with two simulated peers in Vitest, including a
simulated delay), and tests pass. Changelog. Commit and push.
```

---

## Chunk 22: Content volume and long-term play

```
You are working on Dandori Academy. Fill out the content so the game has 15+ hours and a reason
to come back.

Read first: src/game/progression/achievements.ts, outfits.ts, src/game/modes/modes.ts,
src/game/world/levels/challenges/, src/ui/Wardrobe.tsx, src/game/story/relics.ts.

Tasks:
1. Daily challenge: a seeded daily field generated from the challenge field kit (a procedural
   generator that builds a valid field from templates and validates it with the test player in
   the browser before offering it), with its own daily board.
2. Two new challenge rules with twelve fields each: "Expedition" (a cave dive across several
   floors with no clock, the genre's dungeon-dive mode) and "Escort" (bring a slow Lodestone
   relic home through escalating ambushes).
3. A relic collection worth completing: grow the relic pool to 150 with unique models from the
   kit, organised in themed sets with set bonuses (cosmetic or a story perk).
4. Wardrobe: 20 more outfits with visual changes to the Warden mesh, unlocked across all modes.
5. Photo mode: free camera, depth of field, filters, hide HUD, Sproutling poses, save PNG.
6. Achievements: 40 more spanning the new content, with a few secret ones.

Done when: the daily challenge generates valid fields every day (test the generator over many
seeds with the test player), the two new rules and their 24 fields pass pace tests, relics,
outfits, photo mode and achievements are in, and tests pass. Changelog. Commit and push.
```

---

## Chunk 23: Engineering quality, QA and release readiness

```
You are working on Dandori Academy. Harden the project for a large release.

Read first: package.json, vite.config.ts, .github/workflows/, src/game/save/saveManager.ts,
src/game/world/testBot.ts, src/game/world/level.test.ts, src/game/modes/modes.test.ts.

Tasks:
1. Test speed: the suite takes about ten minutes, mostly whole-day test-player runs. Shard it in
   CI, move whole-day runs to a separate `npm run test:levels` job, and keep `npm test` under
   two minutes for local work.
2. Test player robustness: it gets stuck when a haul's route is open but the Warden's is not
   (a Span-log behind a gate) and when it targets a beast across an unbuilt bridge. Fix both in
   chooseJob (require the Warden can reach a throwing spot; filter foes by reachability), then
   re-measure everything (`npm run balance`, `npm run paces`) and update targets.
3. End-to-end tests: Playwright smoke tests in CI for the title flow, starting and finishing a
   story day, a challenge, a Time Attack lesson and a battle, on low graphics.
4. Saves: a versioned migration pipeline (SAVE_VERSION steps), cloud-free backup by exporting a
   file (exists) plus an optional sync through the browser's File System Access API, and a
   corrupted-save recovery screen.
5. Error handling: an error boundary around the canvas with a friendly recovery, and an opt-in
   local error log the player can copy into a bug report.
6. Shipping: a PWA manifest and service worker for offline play and install, a localisation
   framework (all UI and story strings moved to locale files, English first, pseudo-locale for
   testing), and a credits screen.

Done when: `npm test` is under two minutes, CI shards the level runs, the test player no longer
gets stuck on those two patterns (with targets re-measured), E2E tests run in CI, saves migrate
through versions, the game installs as a PWA, all strings come from locale files, and every test
passes. Changelog. Commit and push.
```

---

## Suggested order and rough size

| Order | Chunk                                 | Why now                                  |
| ----- | ------------------------------------- | ---------------------------------------- |
| 1     | 1 Performance                         | Everything after adds load               |
| 2     | 23 Engineering (test speed, bot)      | Faster iteration for all content work    |
| 3     | 2 Controls and accessibility          | Cheap, wide impact                       |
| 4     | 3 Art kit, then 4 Terrain and light   | The biggest visible jump                 |
| 5     | 5 Sproutlings, 6 Creatures, 7 Bosses  | Characters people remember               |
| 6     | 8 Story framework, 17 Exploration     | Structure before more story content      |
| 7     | 9, 10 Story sections, 11 Narrative    | The campaign a release needs             |
| 8     | 12 Music, 13 Sound                    | Once the places and beats exist to score |
| 9     | 14 Challenges, 15 Time Attack         | Polish the modes with the new kit        |
| 10    | 16 Systems, 19 Onboarding, 18 UI      | Depth and the first hour                 |
| 11    | 20 Replays, 21 Multiplayer, 22 Volume | Longevity                                |
