export interface Release {
  version: string;
  /** Release date, YYYY-MM-DD. */
  date: string;
  changes: readonly string[];
}

/** Every release, newest first. The first entry is the running version. */
export const CHANGELOG: readonly Release[] = [
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
