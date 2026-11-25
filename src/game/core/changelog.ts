export interface Release {
  version: string;
  /** Release date, YYYY-MM-DD. */
  date: string;
  changes: readonly string[];
}

/** Every release, newest first. The first entry is the running version. */
export const CHANGELOG: readonly Release[] = [
  {
    version: '0.29.1',
    date: '2026-11-25',
    changes: [
      'Shellback Beetles now appear in two challenge fields, Gravelmaw’s Den and Four Kinds, whose targets have been re-measured and whose leaderboards start afresh.',
      'Caves can lead further down: under the Orchard’s Root Cellar lies the Sunken Cistern, where one of the Clock’s parts now waits.',
    ],
  },
  {
    version: '0.29.0',
    date: '2026-11-25',
    changes: [
      'The story’s characters come into the world: short scenes play at its beats (the first morning, each section’s first day, every Clock part coming home), with Headmaster Sprocket, Proctor Ashwick on the radio, Tindle the first Emberling, and a new face, Warden Quill. Click to move on, or skip.',
      'Characters speak in voices of their own, and so do the Headmaster’s remarks and Ashwick’s tips.',
      'The Warden’s log: every story day ends with a journal entry about what happened, kept in the Journal.',
      'The Field Guide’s beast entries open once you have beaten that beast, and every boss has a note from the Warden and one from the Headmaster. There is also a secret about why the Clock stopped.',
    ],
  },
  {
    version: '0.28.0',
    date: '2026-11-25',
    changes: [
      'Two more story sections, completing the Great Clock’s 42 parts: the Clockwork Foundry, where conveyor belts carry hauls and Sproutlings where they run and the Galewing roosts on the bell tower; and the Frostglass Observatory, with spark coils, Lodestones and a great telescope that shows hidden relics when you look through it.',
      'The final boss, the Hollow Warden: in each of its four phases only one kind of Sproutling truly hurts it, and the boss bar tells you which.',
      'A finale: the Great Clock in the Academy courtyard, your ending, and the credits. Every section stays open afterwards.',
    ],
  },
  {
    version: '0.27.0',
    date: '2026-11-25',
    changes: [
      'A new story section: the Sunken Orchard, an old fruit orchard half drowned by a burst cistern. It opens once six Clock parts are home.',
      'Ten more parts of the Great Clock to find, across the Crate Yard, Watering Can Island, the Root Cellar under the great tree, and the Mire Lord’s pond. Two of them need gifts from the Quad’s parts.',
      'Water everywhere: bring Dewlings. Bridges to build, a bramble door, a hidden store, a cave, and twenty-odd beasts including Pike Newts, Pollen Moths and a wasp nest.',
      'Treasure carried home in a story cave now counts for the section, and stays taken.',
    ],
  },
  {
    version: '0.26.0',
    date: '2026-11-25',
    changes: [
      'The story is ready for more of the grounds: each section keeps its own progress, and the base camp lists them, opening each once enough Clock parts are home. Your story so far carries on as the Wild Quad’s.',
      'The Great Clock’s gifts: each of the first seven parts home grants a lasting ability, from a longer whistle and a quicker Kiln to a lantern for caves. Two parts in the Quad can only be reached once you have the right gift.',
      'Stakes: the Clock should strike for the first day of term, 30 days in. Three endings depend on how many parts are home and when. Turn on “Relaxed story” in the settings to take as long as you like.',
      'Fog of war: the base camp map and the minimap show only the ground you have explored. Clock parts still out appear on the map once the Clock can chime for them.',
    ],
  },
  {
    version: '0.25.0',
    date: '2026-11-25',
    changes: [
      'Bosses are now set pieces: the first time you rouse one on a field, it gets an intro with its name and title (click to skip), and every boss fights in three phases, marked on its health bar.',
      'The Gravelmaw now burrows and comes up under your squad in its last phase; the Lanternroot sprouts Bogspitters and regrows its knots faster.',
      'Two new bosses, each with a new Mission: the Galewing in The High Wind, which dives from out of reach and then lies open on the ground, and the Mire Lord in The Mire, which spits waves of pond water that only Dewlings can swim through.',
      'Every boss drops a named relic of its own for the Field Guide, and boss music has its own key for each boss and quickens with each phase.',
      'The boss lessons’ arenas are dressed to match. Their Time Attack targets and the targets of a few challenge fields with bosses have been re-measured.',
    ],
  },
  {
    version: '0.24.0',
    date: '2026-11-25',
    changes: [
      'Eight new beasts, each with a trick of its own: the Pollen Moth (flies out of reach of anyone on foot and carries Sproutlings off), the Burrow Grub (hides underground and erupts under hauls), the Shellback Beetle (flip it with Stonelings), the Sleeper Slug (beat it before it wakes), the Pike Newt (hunts in and beside water), the Thornback Hedgehog (spines, unless it is curled up), the Mimic Cap (a Glowcap that bites) and the Spark Wasp Nest (its wasps cannot sting Sparklings).',
      'All eight roam the Wild Quad in the story, and seven of them now appear in two challenge fields each. Those fields have new Platinum and Diamond targets, and their leaderboards start afresh.',
      'The Field Guide has a new Beasts section with a note on how to deal with each one.',
    ],
  },
  {
    version: '0.23.1',
    date: '2026-11-25',
    changes: [
      'A lost Sproutling’s last moment now shows how it went: burned to ash, sinking under the water, jolted rigid by a spark, or flattened.',
      'Butterflies flutter over outdoor fields, and idle Sproutlings hop off after any that come close.',
    ],
  },
  {
    version: '0.23.0',
    date: '2026-11-25',
    changes: [
      'Story: your Sproutlings now wait in the ground round the Kiln each morning. Pluck them with the interact key, or hold it to sweep up a whole patch.',
      'Story: Sproutlings grow from leaf to bud to bloom, by living through days or by drinking Dewdrops of nectar from plants and beaten beasts. Buds are 15% faster, blooms 30%, and you can see a bud or a flower on their heads. Your squad keeps its growth from day to day.',
      'Every kind has its own voice: Emberlings bright, Stonelings low, Dewlings bubbly and Sparklings buzzy. They call out when thrown, landing, lifting, plucked, rescued or in trouble, chant "heave-ho" in time while carrying, and cheer when a haul comes home. A big crowd is kept from turning into noise.',
      'A lost Sproutling’s spirit rises in its kind’s colour, with a soft bell.',
      'Idle Sproutlings fidget: they sit down for a rest, hop, wave at the Warden, cheer near the Kiln when something comes home, and cower when a beast is on the hunt nearby.',
      'Challenges, Time Attack and Battles play exactly as before.',
    ],
  },
  {
    version: '0.22.0',
    date: '2026-11-25',
    changes: [
      'The ground comes alive: paths of bare soil worn from the Kiln to every treasure, soil round the feet of walls and along the water, and moss in the shade of walls.',
      'Meadow, marsh and dusk fields are ringed by giant grass and flowers that sway in the wind, with lily pads on the marsh water. Lower graphics settings draw fewer of them.',
      'New water: deeper in the middle, foam along the banks, and ripples round every Sproutling wading through it.',
      'In the story the sun now sets over the last 90 seconds of every day, so the light itself tells you it is time to gather your Sproutlings in.',
      'Mist over the marsh and at dusk, and shafts of light through the glass roof of the Terrarium.',
      'A new Comfort setting turns off the miniature blur at the top and bottom of the screen.',
    ],
  },
  {
    version: '0.21.0',
    date: '2026-11-25',
    changes: [
      'A new look for the whole game: soft toon shading in three bands with a warm rim light on everything, and ink outlines round walls, creatures, Sproutlings and treasure on medium and high graphics.',
      'The garden at insect scale: walls can now be giant everyday things (clipped hedges, garden brick, flowerpots, picket fences, books, roof tiles, roots, greenhouse glass and clockwork gears), and fields are dressed with giant flowerpots, watering cans, trowels, gloves, teacups, pocket watches and more.',
      'Many Hands, Over the Wall, Seedbed and Pod Orchard are the first fields dressed this way. Nothing about how any field plays has changed, and no leaderboard was reset.',
    ],
  },
  {
    version: '0.20.1',
    date: '2026-11-24',
    changes: [
      'Plays offline once opened, and installs to a home screen or desktop like an app, with its own icon.',
      'If your saved progress ever cannot be read, it is kept safe instead of being replaced, and offered to you as a download. Future changes to the save format upgrade old saves step by step.',
      'A crash in the 3D view now shows Try again and Back instead of a blank screen. Errors are noted on your device only (Settings, Error log) so you can copy them into a bug report.',
      'The Academy\u2019s test player no longer gets stuck on a haul or a beast it cannot reach to throw at, such as a Span-log behind a closed gate. Four challenge fields and Rush Hour have new Platinum targets measured with it (Spark Hedge, Bridge Builders, Gatekeepers, Masterwork); their Academy boards start afresh.',
      'A Language setting, and the groundwork for translations: the menus, the base camp, the challenge list and the pause menu read their text from translation tables, with a test language that shows anything not yet translated. Credits are on the menu.',
      'Behind the scenes: tests run in seconds (the whole-day test-player runs are separate), and every change is checked automatically, including playing every mode in a real browser.',
    ],
  },
  {
    version: '0.20.0',
    date: '2026-11-24',
    changes: [
      'Gamepads: play the whole game on a controller. The left stick moves, the right stick aims (with aim assist that snaps onto a nearby job, which can be turned off), RT throws, LT whistles, A charges, B dismisses, X goes down or knocks, LB and RB step through the kinds, Y pulls out to the tactical view, View fast-forwards and Menu pauses. In menus the D-pad or left stick moves between buttons, A chooses and B goes back. Prompts on screen show the pad\u2019s buttons while a pad is in use.',
      'Every control can be rebound, in Settings under Controls: two keys or mouse buttons and a gamepad button for each action. A key already in use is moved rather than shared, and you are told what lost it. Esc and the pad\u2019s Menu button always pause. Proctor Ashwick\u2019s tips name the keys and buttons you actually have.',
      'Each kind of Sproutling now has its own head shape as well as its colour (Emberlings a flame tuft, Dewlings a droplet, Stonelings a square cap, Sparklings a zig-zag bolt), with matching icons on the HUD, so the kinds can be told apart in greyscale.',
      'Colour palettes for red-green and blue-yellow colour blindness recolour the kinds, the rings that warn of an attack landing and the medal colours, chosen so every pair stays far apart for those players.',
      'Comfort settings: text and menu size from 90% to 150%, reduced motion (no shake, punch or freeze-frames, calmer bursts, no pulsing menus; on by default if your system asks for less motion), a high-contrast HUD, whistle and fast-forward that toggle instead of being held, and a throw arc that always shows.',
      'Briefings, the pause menu and the results are announced as dialogs to screen readers, and the results say the outcome in one sentence. Every menu can be reached with the keyboard or a pad, with a visible focus ring. Esc goes back from any menu screen to the main menu.',
      'New keys: X steps back through the kinds, = and - zoom, and P pauses as well as Esc.',
    ],
  },
  {
    version: '0.19.1',
    date: '2026-11-24',
    changes: [
      'Much faster to start: the first screen now loads about a tenth of what it did (190 KB instead of 2.2 MB, gzipped). The 3D scene and the physics engine load quietly in the background while you are on the menus, and a glowing Kiln shows if a day is ready before they are.',
      'Smoother on high graphics: ambient occlusion now works from the depth the scene already drew instead of drawing the whole scene a second time, and tiny parts no longer cast shadows nobody can see. The largest fields draw about half as much per frame.',
      'Press F3 during a day for a performance readout: frame rate, frame time, draw calls, triangles and the simulation\u2019s time.',
      'On a slow device, the first day measures how smoothly it runs and lowers the graphics once if it needs to, and says so. It never raises them, and never overrides a level you chose.',
    ],
  },
  {
    version: '0.19.0',
    date: '2026-11-24',
    changes: [
      'A new Story, in the spirit of the first game of the genre: an open expedition into the Wild Quad beyond the Academy\u2019s east gate, to bring home the twelve parts of the stopped Great Clock. Go anywhere, in any order, over as many days as it takes. Everything you do stays done: relics brought home, beasts beaten, gates broken (or half broken), bridges built (or half built) and beacons lit are still that way the next day.',
      'Sunset matters in the story: whoever is not in your squad, or near the Kiln or a lit beacon, when the sun goes down is lost. The Headmaster calls it a minute before. The Sproutlings who make it home wait in the Kiln for tomorrow, and new kinds are found as seed pods out in the Quad. Plan each day from the base camp, with a map of the Quad, the Kiln\u2019s stock and the Clock\u2019s parts.',
      'The lesson run that was the story is now Time Attack: the same thirty lessons in order on the Academy map, every clear timed against your best and the Academy\u2019s own pace.',
      'Every challenge has twelve fields of its own, built for its rule, instead of reusing the lessons: pod orchards and Mossback pastures for the Growing Season, hoards of twins, Dewglass and Lodestones for the Treasure Hunt, herds, packs and the great beasts for the Mission, routing puzzles of gates, bridges, beacons and ledges for the Dandori Challenge, and careful hazard puzzles for the Lean Squad Trial. The first three of each are open; each one after opens with a medal on the one before.',
      'Each challenge follows its own rules. The Lean Squad Trial has no clock at all: the Kiln grows nothing, every Sunshard must come home, and medals go by how many Sproutlings you lose. A Growing Season\u2019s medals go by your headcount at sunset. Every field\u2019s Platinum is set by the Academy\u2019s test player playing it under that challenge\u2019s rules.',
      'Runs from challenges played on lessons in 0.18.0 stay on their lessons\u2019 boards, closed to new runs. Achievements that counted lessons with medals now count challenge fields, and three new ones follow the Great Clock.',
    ],
  },
  {
    version: '0.18.0',
    date: '2026-11-23',
    changes: [
      'Ways to play, in the spirit of the classics of the genre: the main menu now offers Story, Challenges and Battles.',
      'The story is played from an illustrated map of the Academy grounds: a region for each term round the Academy, the trail through every lesson, the Undercroft beneath, and caves beside the lessons that lead to them. The story keeps no score now: bring every Sunshard home to clear a lesson and open the next. It counts the days you take, and the results show what the day did.',
      'Five challenges, each with its own rule, medals and Academy board: Growing Season (your headcount at sunset), Treasure Hunt (treasure, survivors and time, with a Perfect Bloom for losing nobody), Mission (the time bonus only on a 100% clear), Dandori Challenge (weight home, and seconds once everything is collected) and the Lean Squad Trial (no new Sproutlings at all). The HUD shows your score so far and the next medal, and the day can be ended early from the pause menu.',
      'Collecting everything now matters: in the Mission, the Dandori Challenge and the Trial, Platinum and Diamond need every Sunshard, every beast and every carcass, at a pace measured for collecting everything.',
      'Glowcaps add to a challenge score on their own line but never count for a medal, so they can neither block one nor buy one.',
      'Three battles against a CPU rival working their own copy of the field, shown on a second map: Marble Race, Bingo Race and Dandori Duel, against Cadet Pell, Warden Quill or Proctor Ashwick.',
      'Twin pairs are easy to tell apart: each pair in a lesson has its own colour, marker shape and letter on the field, the minimap and the briefing, and once the first half is home the HUD counts down the seconds left to bring the other.',
      'Achievements reworked for the new modes, and 10 new ones: Perfect Bloom, a medal in every challenge, battle wins, beating Proctor Ashwick and more. Old saves keep their progress: lessons passed under the old ranks count as cleared, and their runs stay on the Classic board.',
      'Fix: on Hard, pausing could rebuild the day from the start.',
    ],
  },
  {
    version: '0.17.1',
    date: '2026-11-21',
    changes: [
      'Fix: Diamond was impossible on some lessons (The Guard among them) because Glowcaps counted towards the rank but sprout after the Diamond time. Glowcaps now add to your score but never to your rank, so Diamond never waits for one. Twin pairs and Dewglass, which are there from the start, still count.',
      'The results tally shows the ranked score, then the Glowcaps on top, then the total; the HUD and the briefing list Glowcaps as extras, apart from the bonus that counts.',
      'A test now checks that every lesson can reach Diamond at its Diamond time without a single Glowcap.',
      'Runs already on the Academy board from 0.17.0 stay there, checked against the rules they were played under. The board now only resets a lesson when its layout changes, never for new wording or rank targets.',
    ],
  },
  {
    version: '0.17.0',
    date: '2026-11-19',
    changes: [
      'The leaderboard is automatic: every new personal best is posted to the Academy board by itself, with your Warden name, and shows up at once. Set your name, or turn posting off, on the Leaderboard tab. There is still no server: runs travel through a free public relay and a scheduled GitHub Action keeps the board in the game\u2019s own repository.',
      'A clearer score. The results tally now separates required treasure (Sunshards, x of y) from optional bonus treasure (Glowcaps, twin pairs on time, Dewglass kept whole, x of y), and shows the Sproutlings you ended with, lost, and the most the lesson could end with.',
      'Under the tally, Next shows how far the next rank is and exactly where the day left points behind, biggest first: Sunshards left out, each kind of bonus missed, Sproutlings lost, then time. When nothing else was missed it says plainly that only time stands in the way.',
      'The HUD counts Sunshards and bonus treasure separately, and every briefing lists what is required and what is optional, and what the optional treasure is worth.',
      '39 new achievements, 66 in all: rank milestones up to twenty Diamonds, Full Basket and the other bonus feats, a feat for each kind\u2019s special job, rescues, growing, caves, flawless boss fights, photo finishes, chains, pacifist days, Hard feats, and the leaderboard.',
    ],
  },
  {
    version: '0.16.0',
    date: '2026-11-18',
    changes: [
      'Sproutlings: the Kiln now grows four kinds. Emberlings are fireproof and hit hard; Dewlings wade, carry straight through water and shrug off drips; Stonelings lift like two, hit like three and crack crystal; Sparklings are quick, thrown farthest and unharmed by sparks. Choose which kind to throw with 1 to 4, C, the kind chips or the Kind button.',
      'New hazards made for them: flame vents that burst on a beat, spark coils that arc between their pylons, and shards sunk in ponds and rivers. A Sproutling caught by a vent catches fire and one that lands in water flounders; whistle it within three seconds or it is lost.',
      'Seed pods grow their own kind, and anything else grows whichever kind carried it home; the Kiln never lets a kind of the day die out, so no job is ever shut for good. Each kind is introduced by Ashwick in its own lesson (Dewlings in 6, Stonelings in 8, Sparklings in 11), and every lesson after that has work for its squad. The briefing shows the day\u2019s squad, and the Field Guide describes all four.',
      'Every lesson is fuller: Glowcaps, Sapdrops, mounds, twins, Dewglass and Lodestones now appear from the first term on, alongside the new vents, coils, ponds and crystal vaults.',
      'The squad no longer dodges by itself: it follows the Warden into a charge lane or a slam ring, and dies there. Lead it out.',
      'Caves are part of the day now. Going down a way down pauses the surface, clock and all, takes the squad with you, and the same stair brings everyone back up to carry on. Relics found below go to the Field Guide.',
      'Six ranks: Copper, Bronze, Silver, Gold, Platinum and Diamond. Platinum is much harder: its time is now the test player\u2019s own clear time, and both Platinum and Diamond need every Sunshard home. Diamond asks for the day in 85% of the Platinum time. New achievement and outfit for Diamond.',
      'Leaderboard: your ten best runs on every lesson, and the Academy board, kept as issues on the game\u2019s GitHub repository with no server of its own. Post a run from the results screen; every entry is signed and checked against the lesson\u2019s rules before it is shown.',
    ],
  },
  {
    version: '0.15.0',
    date: '2026-11-17',
    changes: [
      'The Grand Curriculum: five final examinations (lessons 23 to 27) in the old Terrarium under the Academy, each at least three times the size of an early lesson. Terrace Gardens, The Long Drop, Crystal Conservatory, Clockwork Causeway and Restoration Day each add one routing idea of their own.',
      'Raised terraces with cliffs and stone stairways. Emberlings can be thrown up a cliff, but what they carry has to come down by the stairs or off a ledge.',
      'One-way ledges: hauls and the Warden can drop off them, and nobody can climb back up. They are the fast way home.',
      'Crystal gates seal off whole wings; outposts beyond them move your base forward once they are lit.',
      'The Relics of Harmony: every Sunshard is now set into a named relic, such as the Sun-Drenched Pocketwatch, the Gilded Acorn or the Porcelain Teacup, each modelled and announced by name as it comes home. The new Field Guide shows every relic you have recovered, turning on a stand.',
      'Headmaster Sprocket of the Grand Botanical & Clockwork Academy comments on your day: openings, chains, rare relics, disasters and milestones, and gives a verdict on the results screen. He can be turned off in Settings.',
      'Emberlings rebuilt: legs and feet that step with their speed, arms, woven baskets, and a leafy head-sprout on a spring. They lean into turns, look round and chat when idle, flip through the air with wind trails, squash on landing, heave together under a load, sweat under heavy ones, and leap back with wide eyes when danger comes.',
      'The Warden rebuilt too: stepping legs, swinging arms, a sprung hat and pack lamp, and flapping coat tails.',
      'The world is older: long walls are now ruined brickwork with moss on top, and the fields have broken pillars, stone arches, half-buried brass gears and fallen leaves. Grass parts round the Warden and the squad.',
      'V (or the Map button) pulls the camera out to a tactical view of the whole course. Markers at the edge of the screen point home and to the nearest relic nobody has lifted.',
      'Side lessons are renumbered 28 to 30. Two new achievements: Restorer and Curator.',
    ],
  },
  {
    version: '0.14.0',
    date: '2026-11-17',
    changes: [
      'Personal-best splits: every Sunshard you bring home is compared with the same shard on your fastest clear, shown at the Kiln and as a PB chip on the HUD. Results show your clear time against your best.',
      'Delivery chains: Sunshards and Glowcaps arriving within six seconds of each other build a chain, with a rising chime and a banner. It is for show, and the results show your longest chain.',
      'Big moments hit harder: a brief freeze and a camera punch when an enemy falls, a gate breaks, a shield drops, a bridge is finished or a boss changes phase.',
      'The camera leans a little toward where you aim, swoops down at the start of a day, and circles the whole map while the briefing is up. The briefing now sits to one side on wide screens so the map can be seen.',
      'The last thirty seconds pulse red at the edges of the screen.',
      'Results tally up line by line and the medal stamps down with its fanfare. On wide screens the medal and buttons sit beside the journal and targets, so nothing is scrolled out of view.',
      'Wardrobe: eight outfits for the Warden, earned with medals, boss wins, Hard mode and one less obvious place. Choose one under Wardrobe & settings.',
      'The lesson list opens with a title and a Continue button that takes you to the next lesson to pass.',
    ],
  },
  {
    version: '0.13.0',
    date: '2026-11-17',
    changes: [
      'The Depths: three new cave lessons under the Academy. The Cistern (a flooded hall to bridge), Skitter Warren (fifteen chambers of Skitters) and The Root Cellar (a Lanternroot in the dark).',
      'Each is reached by an old way down hidden in lessons 19, 20 and 21. Walk onto it to find the lesson for good; you can go straight down, or play it later from the lesson list.',
      'The back room: looking around is now smooth on phones (drag to look), it fits tall screens, and it is lighter to draw on phones.',
      'The back room has its own slow, dark jazz: walking bass, brushes, low chords and a tenor, over a crackling record.',
      'More sounds at the table: the regulars mutter when they speak, a chime when it is your turn, a swell for an all-in, chips raked to the winner and every card dealt.',
      'Sound now starts reliably on iPhone and iPad after the first tap.',
      'New achievement: Spelunker.',
    ],
  },
  {
    version: '0.12.0',
    date: '2026-11-17',
    changes: [
      'A story: four terms and an ending. Proctor Ashwick briefs you before every day, a journal fills in as lessons are passed, and the lessons are grouped by term.',
      'A dungeon lesson, The Undercroft (22): dark tunnels and rooms, a chasm to bridge, rubble to break, packs of Skitters, and a new boss, the Snuffer, which can only be hurt inside the glow of a lit beacon.',
      'Beacons: walk up to a cold beacon to light it. Hauls then go to the nearest light instead of all the way back to the Kiln, and new Emberlings hatch where their pod was delivered.',
      'Each term has its own setting: spring meadow, autumn, misty marsh, dusk, and the cave, with its own ground, trees, sky, weather in the air and music.',
      'New sound: effects are placed left and right by where they happen, with reverb to suit the setting, Emberling voices, footsteps, ambience (birds, wind, frogs, crickets, dripping rock) and a medal fanfare for each rank.',
      'New music: a tune for each term, the menus and boss fights. It adds drums when danger is close and speeds up for the last thirty seconds.',
      'Advice during a day from Proctor Ashwick: controls in the first lessons, then only what you seem to be missing. It can be turned off in Settings.',
      'Hold Shift to fast-forward, hold Tab to look at your idle Emberlings, and press R on the pause or results screen to restart.',
      'A boss far across a big map no longer shows its health bar until you meet it.',
      'Difficulty re-measured on every lesson with the test player (see BALANCE.md). Platinum is tighter on Gravelmaw\u2019s Pit, Rush Hour, The Bellwether and Graduation Day, and a little more forgiving on Final Exam and Glass River.',
      'Fix: an enemy shaking Emberlings off next to a thin wall could drop them on the far side of it.',
      'There is said to be a small door somewhere under the Academy. The Emberlings deny it.',
    ],
  },
  {
    version: '0.11.0',
    date: '2026-11-16',
    changes: [
      'Five new lessons (17 to 21) on much bigger, branching maps: a central hub with several ways home, rivers and optional side areas.',
      'New jobs: mounds that idle Emberlings dig up, and Span-logs that build a bridge when enough reach a riverbank.',
      'New hauls: Sapdrops speed every haul up for 30 seconds, twin shards pay a bonus when both arrive within 10 seconds, Dewglass cracks if its crew breaks up, and Lodestones crawl until fully crewed.',
      'Easier to see danger: a red bite zone, a "!" over hunting enemies with a line to their target, a hunting ring as you approach, a shake gauge, flashing workers who are about to be hit, and stars over dazed ones.',
      'A minimap, and red arrows at the screen edge pointing to Emberlings in danger off screen.',
      'More detailed creatures: Emberlings have arms and legs and lift their hauls; enemies walk on legs, have eyes and jaws, and flash when hit.',
      'Labels, health bars and score popups stay sharp on High graphics.',
    ],
  },
  {
    version: '0.10.0',
    date: '2026-11-16',
    changes: [
      'Hard mode: switch between Normal and Hard on the lesson list. A lesson opens on Hard after Gold on Normal.',
      'On Hard, enemies have 25% more health and strike sooner, the Warden has two hearts, drips are deadly, each lost Emberling costs double and the day is 10% shorter.',
      'Hard keeps its own best rank and score for every lesson, and they count towards the academy total.',
      'Two new achievements for Hard mode.',
      'Fix: each dew drip fell twice, and a Glowcap could sprout twice.',
    ],
  },
  {
    version: '0.9.0',
    date: '2026-11-16',
    changes: [
      'Six new lessons (11 to 16), including three boss fights: the Gravelmaw, the Lanternroot and the Bellwether.',
      'Bosses are armoured or shielded. Each has a moment to strike, shown on its health bar across the top of the screen.',
      'Bramble gates block the way home until broken. Dew drips knock carriers off their haul. Glowcaps sprout mid-day for bonus score.',
      'Harder: Platinum times are 10% slower than a test player (30% on the first three lessons), and Gold needs 85% of par.',
      'New look: soft shadows, ambient occlusion, glow, a miniature depth-of-field blur, textured lawn, boulders and clay, wind in the grass, clover and mushrooms.',
      'Graphics setting (Low, Medium, High) replaces the shadows switch.',
      'Off-duty Emberlings scramble out of boss slam rings and charge lanes.',
      'Five new achievements.',
    ],
  },
  {
    version: '0.8.0',
    date: '2026-11-13',
    changes: [
      'Touch controls for phones and tablets: a joystick to move, touch the field to throw, and Whistle, Charge and Dismiss buttons.',
      'Hold the Whistle button and drag to move the call circle. Pinch with two fingers to zoom.',
      'The HUD is compact on small screens and keeps clear of notches, and tall screens start zoomed further out.',
    ],
  },
  {
    version: '0.7.0',
    date: '2026-11-13',
    changes: [
      'Enemies fight back. A Mossback shakes attackers off sooner and bites the dazed: whistle them clear in time.',
      'Two new enemies: the Ramhorn, which charges through the squad and then stands winded, and the Bogspitter, which lobs globs from range.',
      'Every attack is telegraphed, and a hit knocks the Warden back.',
      'Charge order (F or middle mouse) sends the whole squad at the cursor. Throws aimed near an enemy home in on it.',
      'Emberpods: light hauls that hatch into two new Emberlings.',
      'Sound effects and music, with volume sliders in Settings.',
      'Particles, camera shake, score popups, a throw arc, scenery, and light that turns to sunset as the day runs out.',
      'The HUD shows a day bar marked with the Gold and Platinum deadlines.',
      'Lessons 3 to 10 are rebalanced for the new enemies. Earlier best scores are kept.',
    ],
  },
  {
    version: '0.6.0',
    date: '2026-11-13',
    changes: [
      'Settings & save shows the game version and this revision history.',
      'Save files use a protected .dandori format. A file that has been edited or damaged is refused.',
      'Old .json save files can no longer be loaded. Download a new save file to keep a backup.',
    ],
  },
  {
    version: '0.5.0',
    date: '2026-11-13',
    changes: [
      'Platinum is reachable on every lesson. Lesson 1 used to need a finish at 0 seconds.',
      'Each lesson has a Platinum finish time; Gold and Silver need 80% and 55% of its score.',
      'The lesson list, pause menu and results screen show the score and time each rank needs.',
      'Leftover time rounds up, matching the on-screen clock.',
    ],
  },
  {
    version: '0.4.0',
    date: '2026-11-13',
    changes: [
      'Download progress as a save file, load it back, or erase all progress.',
      'Settings: shadows, carrier counts, health bars, pause when away and zoom speed.',
      'Esc opens a pause menu with resume, restart, settings and quit.',
      '15 achievements, announced on the results screen.',
    ],
  },
  {
    version: '0.3.0',
    date: '2026-11-13',
    changes: [
      'Five new lessons: Divide and Conquer, The Gauntlet, Growing Pains, Switchbacks and Final Exam.',
    ],
  },
  {
    version: '0.2.0',
    date: '2026-11-10',
    changes: [
      'Lesson select with five lessons. Silver or better unlocks the next one.',
      'Next lesson and quit buttons, and a best rank and score for every lesson.',
      'A day now ends when no Emberlings remain.',
      'Mossbacks bite and shake off attackers more slowly.',
    ],
  },
  {
    version: '0.1.0',
    date: '2026-11-10',
    changes: [
      'First playable version: throw, whistle and carry Sunshards to the Kiln before the day ends.',
      'One lesson, Mossbacks, and Bronze to Platinum ranks.',
    ],
  },
];

export const GAME_VERSION = CHANGELOG[0].version;
