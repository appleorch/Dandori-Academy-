export interface Release {
  version: string;
  /** Release date, YYYY-MM-DD. */
  date: string;
  changes: readonly string[];
}

/** Every release, newest first. The first entry is the running version. */
export const CHANGELOG: readonly Release[] = [
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
