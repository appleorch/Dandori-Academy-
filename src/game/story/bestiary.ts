import type { EnemyKind } from '../enemies/enemyKinds';

/**
 * The Field Guide's notes on the beasts of the Academy grounds: what each does, and how the
 * Academy's best Wardens deal with it. Structures (gates, mounds, root-knots) are left out.
 */
export const BESTIARY: readonly { kind: EnemyKind; note: string }[] = [
  {
    kind: 'mossback',
    note: 'A slow grazer that bites what is in front of it. Cling to its sides.',
  },
  {
    kind: 'ramhorn',
    note: 'Paws the ground, then charges in a straight line. Step aside, then pile on while it stands winded.',
  },
  {
    kind: 'spitter',
    note: 'Lobs globs where the crowd is thickest. Spread out, and throw before it swells.',
  },
  {
    kind: 'skitter',
    note: 'Nothing alone, a disaster in a crowd. Throw before they reach you, not after.',
  },
  {
    kind: 'moth',
    note: 'Flies out of reach of anyone on foot: only a thrown Sproutling can hit it. It swoops and carries one off; hit it hard before it gets away and it lets go.',
  },
  {
    kind: 'grub',
    note: 'Moves unseen under the lawn; only a ripple shows where. It erupts under hauls on the move. Underground nothing touches it, but it must come up for air.',
  },
  {
    kind: 'shellback',
    note: 'A shell nothing much gets through, until two Stoneling hits in quick succession (or a hail of four from anyone) flip it onto its back. Then it is soft.',
  },
  {
    kind: 'slug',
    note: 'Asleep, and harmless while it stays so. The whistle near it, a fight nearby or a first hit wakes it a moment later. Beat it in one volley and it never wakes at all.',
  },
  {
    kind: 'newt',
    note: 'Hunts in the water and on its banks, and nowhere else. Dewlings can fight it there; everyone else should keep clear of the bank.',
  },
  {
    kind: 'hedgehog',
    note: 'Its spines finish whoever clings on, unless it is curled up: as it is while winded after a charge, or for a while after a Stoneling knocks it.',
  },
  {
    kind: 'mimic',
    note: 'Exactly like a Glowcap, except that it twitches now and then, and nobody comes to carry it. Whoever comes close is bitten. A thrown Sproutling unmasks it safely.',
  },
  {
    kind: 'waspnest',
    note: 'Sends out Spark Wasps while anyone is near, until it is broken. Their stings cannot hurt a Sparkling, so send Sparklings.',
  },
  {
    kind: 'gravelmaw',
    note: 'Boss. Rears over a ring and slams it. Its plates turn most of the damage aside, except while it lies winded after a slam.',
  },
  {
    kind: 'lanternroot',
    note: 'Boss. Rooted and shielded while any of its three root-knots lives. Break the knots, then the bulb, before they regrow.',
  },
  {
    kind: 'bellwether',
    note: 'Boss. Tolls its bell before every charge, and charges more and more often as it weakens.',
  },
  {
    kind: 'snuffer',
    note: 'Boss of the Undercroft. Nothing hurts it in the dark: fight it in the glow of a lit beacon, which it will try to snuff out.',
  },
];
