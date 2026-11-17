/**
 * The academy's story: four terms and what lies under the school. It is told in three
 * places: a briefing from Proctor Ashwick before each day, a journal entry once the
 * lesson is cleared, and Tindle's notes in the journal's margins.
 */

export interface Chapter {
  id: string;
  /** "Term one", "Term two"... */
  label: string;
  title: string;
  /** First and last stage of the chapter, inclusive. */
  from: number;
  to: number;
  /** Read at the top of the chapter on the lesson list and in the journal. */
  intro: string;
  /** A note Tindle scribbles in the margin once every lesson of the chapter is cleared. */
  margin: string;
}

export const CHAPTERS: readonly Chapter[] = [
  {
    id: 'kindling',
    label: 'Term one',
    title: 'Kindling',
    from: 1,
    to: 5,
    intro:
      'The Great Kiln is burning low, and the frost came early this year. Proctor Ashwick has one new cadet, one whistle and a handful of Emberlings to teach before winter.',
    margin:
      'Tindle here. I am the one at the front. The tall one says we did well. The tall one does not know about Thursdays.',
  },
  {
    id: 'field-work',
    label: 'Term two',
    title: 'Field Work',
    from: 6,
    to: 10,
    intro:
      'Past the practice lawn the valley is bigger and less polite. The creatures are restless this autumn. Ashwick says it is the cold. Ashwick does not sound sure.',
    margin:
      'Exam passed. We celebrated in the usual place. Ember up, hats on. If you ever find a small door, be polite and knock.',
  },
  {
    id: 'wild-marches',
    label: 'Term three',
    title: 'The Wild Marches',
    from: 11,
    to: 16,
    intro:
      'Three great beasts have come up out of the ground into the marsh, each with a Sunshard in its belly. Something below is driving them out. The Kiln cannot wait for it to stop.',
    margin:
      'The bell the big one wore has our school crest on it. Nobody has rung that bell in a hundred years. Also: the Contessa cheats. Watch her ember.',
  },
  {
    id: 'long-road',
    label: 'Term four',
    title: 'The Long Road',
    from: 17,
    to: 21,
    intro:
      'The bell came from the Undercroft, the old school under the school, where the first Kiln went dark a century ago. To open it again the Academy needs every shard the valley still holds.',
    margin:
      'You have the whistle for good now. We voted. It was eleven to one and the one was asleep. Five knocks. Not four. Five.',
  },
  {
    id: 'undercroft',
    label: 'After graduation',
    title: 'The Undercroft',
    from: 22,
    to: 22,
    intro:
      'Under the Academy the tunnels are cold and the beacons are out. Somewhere at the bottom lies the First Ember, and the thing that put the lights out is still down there with it.',
    margin:
      'Both fires burning. The tall one cried a bit and blamed the smoke. Table is open late tonight, Warden. Bring chips.',
  },
];

export interface LessonStory {
  /** Proctor Ashwick, before the day. */
  briefing: string;
  /** The cadet's journal, written after the lesson is first cleared. */
  journal: string;
}

export const LESSON_STORY: Record<string, LessonStory> = {
  'many-hands': {
    briefing:
      'Cadet. That whistle is the only thing they listen to, so try not to lose it. Five shards on the lawn. Send exactly as many Emberlings as each one needs and keep walking. Standing still is how the Kiln goes out.',
    journal:
      'First day. Ashwick timed me with a pocket watch and said nothing, which I am told is high praise. The Emberlings carry anything if you throw them at it.',
  },
  'over-the-wall': {
    briefing:
      'Emberlings fly. Sunshards do not. Throw the little ones over the wall and let the shard find its own way round. A Warden who waits for a haul to arrive has already lost the morning.',
    journal:
      'They squeak when thrown. I think they like it. The far jobs were finished before I had walked halfway there.',
  },
  'the-guard': {
    briefing:
      'A Mossback has settled in the gap. It is slow, it is stupid, and it eats Emberlings that fall off its back. Whistle them clear when it starts to shudder. What is left of it will feed the Kiln.',
    journal:
      'It shook them off and I was a breath late with the whistle. I will not be late again. The Kiln turned the carcass into four new Emberlings, which seems a fair trade to everyone but the Mossback.',
  },
  'first-light': {
    briefing:
      'Three lanes, three guards. One of them spits. When a ring appears on the ground, the only wrong place to stand is inside it.',
    journal:
      'Bogspitters aim at crowds. So do not be a crowd. Ashwick says the creatures never used to come this close to the school.',
  },
  'long-haul': {
    briefing:
      'The far shard is heavy and the road is long. Grow the squad first. Pods and carcasses are slow to pay, and they always pay.',
    journal:
      'I spent the first minute fetching pods and felt like a fool. Then I had twice the squad. The Kiln is a little brighter tonight. Only a little.',
  },
  'divide-and-conquer': {
    briefing:
      'Second term. The field is wider than your legs are fast. Split the squad and trust them. They finish the job without you; that is the entire point of them.',
    journal:
      'Four jobs running at once and me standing in the middle like a signpost. For one moment today I think I understood what dandori means.',
  },
  'the-gauntlet': {
    briefing:
      'A Ramhorn charges in a straight line and cannot turn. I leave the rest to your imagination. Mind the squad: it tramples what it does not miss.',
    journal:
      'It hit the rock at full speed and sat there seeing stars. We did not waste them. The creatures are thinner than they should be this time of year.',
  },
  'growing-pains': {
    briefing:
      'Small squad, heavy shards. You cannot lift the big one yet, so do not stand there looking at it. Hatch, hunt, and come back when you can.',
    journal:
      'Started with seven. Finished with dozens. Tindle rode home on top of the last shard and I pretended not to notice.',
  },
  switchbacks: {
    briefing:
      'The path home doubles back on itself. A shard walks the road, an Emberling flies the wall. Start the furthest haul first and it will arrive with the rest.',
    journal:
      'Everything came home in the same minute, from four directions. Ashwick wrote something in the book. I was not shown what.',
  },
  'final-exam': {
    briefing:
      'Final examination. Every creature you have met, on one field, before sundown. I will be watching from the wall, and so will the Kiln. Do not embarrass either of us.',
    journal:
      'Passed. As the last shard went in, the ground shook, and for a moment the Kiln burned blue. Ashwick looked at the floor, not the fire. Tomorrow we go past the fence.',
  },
  'bramble-gate': {
    briefing:
      'Beyond the fence the old paths are grown shut. Bramble does not bite, but it stands between your shards and home. Put a crew on it before you need the road, not after.',
    journal:
      'Third term. The marsh smells of rain and something older. The brambles were planted in rows once. Somebody farmed here.',
  },
  'drip-line': {
    briefing:
      'Dew falls here in drops the size of your head. It will not kill an Emberling, only knock it flat and make it drop what it carried. Watch the rhythm. Cross between drops.',
    journal:
      'The drips keep time like a clock. Glowcaps came up after the rain and wilted before I could send anyone. Next time I leave a pair free.',
  },
  'gravelmaws-pit': {
    briefing:
      'The first of the three. A Gravelmaw: plated all over and soft only when it has thrown itself at the ground and missed. Let it miss. It has a shard in its belly that belongs to us.',
    journal:
      'It reared, we scattered, it fell on its face, and thirty Emberlings landed on it at once. There were tunnels in the walls of that pit. It did not dig them. It came up through them.',
  },
  'three-roots': {
    briefing:
      'The Lanternroot does not move and does not need to. Nothing touches it while a root-knot lives. Take all three and it lies open for a few breaths. Be quick; they grow back.',
    journal:
      'Split the squad three ways and brought them together for the bulb. It was guarding a stair. A real one, cut stone, going down. Ashwick had the gap boarded over before dark.',
  },
  'rush-hour': {
    briefing:
      'Everything on this field happens at once and none of it waits. Glowcaps do not keep. You will not get all of it by being careful; you will get it by being organised.',
    journal:
      'I gave up trying to watch everything and started trusting the jobs I had already set. The Emberlings sang on the way home. It may have been squeaking.',
  },
  'the-bellwether': {
    briefing:
      'The last of the three and the worst. It tolls before it runs. Stand in front of something solid and step aside. And cadet: look at the bell when it is down. Tell me what is on it.',
    journal:
      'The Academy crest. Our crest, on a bell older than Ashwick. He told me then about the Undercroft, the first school, and the First Kiln that went dark. He has known all year what was driving them up.',
  },
  crossroads: {
    briefing:
      'Fourth term. We are going to open the Undercroft, and for that the Great Kiln must burn hotter than it has in a century. Every shard in this valley, cadet. Start at the crossroads.',
    journal:
      'Four roads and a job down every one. Ashwick has stopped correcting me. He stands by the Kiln now and counts what comes in.',
  },
  'the-span': {
    briefing:
      'The river took the old bridge. There are logs enough to build another if your Emberlings carry them to the bank. Nothing on the far side comes home until it stands.',
    journal:
      'They built it plank by plank while I was off fighting a Mossback. I came back and there was a bridge. I have rarely been prouder of anything I did not do.',
  },
  'matched-pairs': {
    briefing:
      'Twin shards. The Kiln burns them brighter when they arrive together. Start the far one first and time the near one to meet it. This is arithmetic. Do it properly.',
    journal:
      'Both pairs landed inside the same breath and the Kiln roared. You could see it from the valley floor. Tindle took a bow.',
  },
  'glass-river': {
    briefing:
      'Dewglass. Worth half again what a shard is worth, right up until its crew stumbles. Clear the road before you lift it. Not during.',
    journal:
      'Carried both pieces across two bridges without a crack. My hands shook the whole way and I was not the one carrying.',
  },
  'graduation-day': {
    briefing:
      'Everything, cadet. Bridge, gate, river, glass, twins, and a Gravelmaw at the far end that has not read your reports. Bring it all home and you may keep the whistle. I never much liked it anyway.',
    journal:
      'The Kiln is white-hot and they have unboarded the stair. Ashwick shook my hand and called me Warden. Then he handed me a lantern and said the real examination is downstairs.',
  },
  'the-undercroft': {
    briefing:
      'This is where the school began, Warden. The beacons will light if you walk up to them, and hauls will come to the nearest flame. The thing that lives down here hates the light. Fight it in the glow or do not fight it at all.',
    journal:
      'It put the beacons out and I lit them again, twice, with the squad around my feet in the dark. Then it lay still, and the First Ember was just there, warm, after a hundred years. We carried it up together.',
  },
};

/** Shown once, before the first lesson. */
export const PROLOGUE: readonly string[] = [
  'High on a hill above the valley stands the Dandori Academy, and at its heart the Great Kiln. While the Kiln burns, the frost keeps to the mountains and the dark keeps to the ground.',
  'The Kiln eats Sunshards: splinters of a fallen star, scattered across the valley floor. It gives back Emberlings, sparks with legs, who will carry anything for whoever holds the whistle.',
  'This year the frost came early and the fire is low. The Academy has one cadet left to train. A Warden does not carry shards. A Warden decides who does, and in what order. They call that dandori.',
];

/** Shown after the Undercroft is first cleared. */
export const EPILOGUE: readonly string[] = [
  'The First Ember went into the Great Kiln at dawn, and the fire that came out of it could be seen from the mountains. Down in the Undercroft the old beacons burn again, one after another, all the way to the bottom.',
  'Proctor Ashwick retired that spring. He left the pocket watch on your desk with a note: "You never needed it. Try to be on time anyway."',
  'There is one door in the Undercroft that is not on any plan of the school. The Emberlings say there is nothing behind it. They say it very quickly, and all at once.',
];

export function chapterOf(stage: number): Chapter {
  return CHAPTERS.find((chapter) => stage >= chapter.from && stage <= chapter.to) ?? CHAPTERS[0];
}
