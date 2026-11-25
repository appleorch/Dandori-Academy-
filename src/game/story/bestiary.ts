import type { EnemyKind } from '../enemies/enemyKinds';

/**
 * The Field Guide's notes on the beasts of the Academy grounds: what each does, and how the
 * Academy's best Wardens deal with it. Structures (gates, mounds, root-knots) are left out.
 */
export interface BestiaryEntry {
  kind: EnemyKind;
  note: string;
  /** Bosses only: the Warden's own note, and the Headmaster's. */
  warden?: string;
  sprocket?: string;
}

export const BESTIARY: readonly BestiaryEntry[] = [
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
    warden: 'Never stand in the ring. Never. Then pile on while it lies there wheezing.',
    sprocket: 'It used to sleep under the potting shed. We called it Gerald. We were wrong to.',
  },
  {
    kind: 'lanternroot',
    note: 'Boss. Rooted and shielded while any of its three root-knots lives. Break the knots, then the bulb, before they regrow.',
    warden: 'The knots first, all three, quickly. The bulb only once it is dark.',
    sprocket: 'Planted as a night light in my first year. It has rather outgrown the role.',
  },
  {
    kind: 'bellwether',
    note: 'Boss. Tolls its bell before every charge, and charges more and more often as it weakens.',
    warden: 'Count the tolls; step aside on the last. Then everyone, at once.',
    sprocket: 'It rang the hours for the old farm. It still thinks it is in charge of them.',
  },
  {
    kind: 'snuffer',
    note: 'Boss of the Undercroft. Nothing hurts it in the dark: fight it in the glow of a lit beacon, which it will try to snuff out.',
    warden: 'Fight it in the light, always. Relight the beacons as soon as it puts them out.',
    sprocket: 'It ate my candles every winter for forty years. I have kept a list.',
  },
  {
    kind: 'galewing',
    note: 'Boss. Circles out of reach of anyone on foot and dives on a ring it marks. After a dive it lies on the ground, open to everyone. Later it dives twice, then calls Pollen Moths.',
    warden: 'Watch the ring, not the wings. Throw when it is high, pile on when it is down.',
    sprocket:
      'It nested on the bell tower the summer the Clock stopped. The bells have been very quiet.',
  },
  {
    kind: 'mirelord',
    note: 'Boss. Swims, and spits waves of pond water that only Dewlings swim through. Later every spit brings a wave round it; then it calls Pike Newts.',
    warden: 'Dewlings in the water, everyone else on the bank, and nobody standing still.',
    sprocket: 'A newt we kept in the cistern. Fed it rather well. I take full responsibility.',
  },
  {
    kind: 'hollowwarden',
    note: 'Final boss. The old clockwork Warden, wound wrong. In each of its four phases only one kind truly hurts it: Stonelings, then Emberlings, then Dewlings, then Sparklings.',
    warden: 'It was a Warden once. It is still trying to keep the Clock. Wind it down gently.',
    sprocket: 'My fault, all of it. I wound the Clock the wrong way, and it tried to put it right.',
  },
];
