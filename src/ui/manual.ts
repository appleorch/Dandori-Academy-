/**
 * The in-game manual's pages and the loading screens' tips: plain data, so every mechanic has a
 * page and a test can check none is left out.
 */

export type ManualPicture =
  | 'throw'
  | 'whistle'
  | 'kinds'
  | 'carry'
  | 'beasts'
  | 'gates'
  | 'day'
  | 'story'
  | 'wardens'
  | 'modes';

export interface ManualPage {
  id: string;
  title: string;
  picture: ManualPicture;
  lines: readonly string[];
}

export const MANUAL: readonly ManualPage[] = [
  {
    id: 'throw',
    title: 'Throwing',
    picture: 'throw',
    lines: [
      'Your squad follows the Warden. Aim with the mouse or the right stick and throw (left mouse, RT) to send the Sproutling at the head of the line where the cursor points.',
      'Hold to keep throwing. A Sproutling thrown at treasure picks it up; thrown at a beast, it clings on and fights.',
      'Charge (F, A) sends the whole squad running to the cursor at once.',
    ],
  },
  {
    id: 'whistle',
    title: 'Whistling and dismissing',
    picture: 'whistle',
    lines: [
      'Whistle (right mouse, Space, LT) to call every Sproutling inside the ring back into the squad. Hold it and the ring grows.',
      'A Sproutling on fire or out of its depth can be saved by a whistle in time.',
      'Dismiss (Q, B) sets the squad down where it stands. Idle Sproutlings wait; the HUD counts them, and markers at the screen edge show where they are.',
    ],
  },
  {
    id: 'kinds',
    title: 'The four kinds',
    picture: 'kinds',
    lines: [
      'Emberlings are fireproof and hit hard. Dewlings wade through water. Stonelings lift like two and crack crystal. Sparklings shrug off sparks and fly farthest.',
      'Choose the kind to throw with 1 to 4, cycle with X and C, or on a pad hold D-pad right and point the right stick at the kind wheel.',
    ],
  },
  {
    id: 'carry',
    title: 'Carrying home',
    picture: 'carry',
    lines: [
      'Every haul shows how many Sproutlings it needs. Once enough are lifting it, they carry it to the Kiln; more make it go faster.',
      'Pods grow new Sproutlings. Beasts beaten can be carried home too. Dewglass shatters if dropped, and Lodestones crawl away.',
    ],
  },
  {
    id: 'beasts',
    title: 'Beasts and bosses',
    picture: 'beasts',
    lines: [
      'Watch for the tell: a beast winds up before it bites or charges, and the ground it will hit flashes. Whistle your squad clear.',
      'Bosses change as they are hurt. The bar under the name shows where each phase begins and what the boss is weak to now.',
    ],
  },
  {
    id: 'gates',
    title: 'Gates, bridges and beacons',
    picture: 'gates',
    lines: [
      'Throw Sproutlings at a gate to break it: bramble for anyone, crystal for Stonelings only. A cracked stretch of wall may hide a secret.',
      'Logs carried to a gap build a bridge. Beacons lit by Sparklings light the dark and, in the story, keep your squad safe at sunset.',
    ],
  },
  {
    id: 'day',
    title: 'The day',
    picture: 'day',
    lines: [
      'Every day has a clock. In Time Attack, bring every Sunshard home as fast as you can; in the story, everyone away from the Kiln and the lit beacons at sunset is lost.',
      'Hold Shift (View) to fast-forward, Tab to look at idle Sproutlings, V for the tactical view and M for the full map.',
    ],
  },
  {
    id: 'story',
    title: 'The story',
    picture: 'story',
    lines: [
      'Each day you bring parts of the Great Clock home. What you break, build and beat stays that way. The Kiln keeps everyone who made it home.',
      'Parts brought home give the Clock’s gifts: a radar, a louder whistle, a bridge kit, a lantern for caves and more. At the base camp, plan who goes out and pin spots on the map.',
    ],
  },
  {
    id: 'wardens',
    title: 'Two Wardens and sprays',
    picture: 'wardens',
    lines: [
      'With the Clock’s eighth gift a second Warden joins you. H switches between them, G sends half the squad over, and walking them together merges the squads.',
      'Berries carried home brew sprays: Emberbrew (B) makes the squad faster and fiercer; Stillwater (N) freezes beasts nearby.',
    ],
  },
  {
    id: 'modes',
    title: 'Ways to play',
    picture: 'modes',
    lines: [
      'Time Attack: the lessons, for medals against the clock and a ghost of your fastest run. Press R to restart at once.',
      'Challenges: five rules, twelve fields each, scored to medals from Copper to Diamond. Battles: race a rival Academy on a field of your own.',
    ],
  },
];

/** One of these shows while anything loads. */
export const TIPS: readonly string[] = [
  'Hold the whistle and its ring grows: one long call gathers a scattered squad.',
  'A haul goes faster with more hands. Throw a few extra at the heavy ones.',
  'Stonelings lift like two, and only they crack crystal gates.',
  'Watch a beast wind up before it bites. The ground it will hit flashes.',
  'In the story, sunset is the last minute of the day: be home or by a lit beacon.',
  'Press R in Time Attack to restart at once, straight back in.',
  'Your ghost runs beside you in Time Attack: the path of your fastest clear.',
  'Pin spots on the base camp map with a click, to plan the next day.',
  'A cracked stretch of wall is weaker than it looks.',
  'On a pad, hold D-pad right for the kind wheel and point the right stick.',
  'Pause and open the manual for a page on every mechanic.',
  'Hold M for the full map.',
];

/** A tip, chosen by the moment it is asked for. */
export function tipFor(now: number): string {
  return TIPS[Math.floor(now / 1000) % TIPS.length];
}
