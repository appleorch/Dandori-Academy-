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
  {
    id: 'curriculum',
    label: 'Final examinations',
    title: 'The Grand Curriculum',
    from: 23,
    to: 27,
    intro:
      'With the First Ember lit, the founders\u2019 Terrarium has woken: miles of overgrown glasshouse gardens under the hill, their Relics of Harmony scattered through the ruins. Headmaster Sprocket has set five examinations in it. Pass them all and the Grand Botanical & Clockwork Academy is whole again.',
    margin:
      'Five exams, one day each, and the Headmaster talked through all of them. We have started a sweepstake on his catchphrases. I have \u201cmarvellous\u201d.',
  },
  {
    id: 'depths',
    label: 'Below',
    title: 'The Depths',
    from: 28,
    to: 30,
    intro:
      'The Undercroft is bigger than the school above it. There are old ways down in the far fields, half grown over, and each one leads to a part of it nobody has mapped.',
    margin:
      'We knew about the stairs. We did not say because nobody asked. There is a fourth one. It is behind the piano.',
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
      'Second term, and a new colour in the Kiln. Emberlings are only one kind of Sproutling, cadet: these blue ones are Dewlings, and they walk into a pond as if it were a puddle. The field is wider than your legs are fast. Split the squad and trust them.',
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
      'Small squad, heavy shards, and two Stonelings. They are slow, they are grey, and they lift like two. The big one sits behind crystal, and only a Stoneling cracks crystal properly. Hatch, hunt, and come back when you can.',
    journal:
      'Started with seven. Finished with dozens. Tindle rode home on top of the last shard and I pretended not to notice.',
  },
  switchbacks: {
    briefing:
      'The path home doubles back on itself. A shard walks the road, a Sproutling flies the wall. Start the furthest haul first and it will arrive with the rest.',
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
      'Beyond the fence the old paths are grown shut, and the old spark coils still hum. Meet the Sparklings: they fly farthest and a coil cannot touch them. Bramble does not bite, but it stands between your shards and home. Put a crew on it before you need the road.',
    journal:
      'Third term. The marsh smells of rain and something older. The brambles were planted in rows once. Somebody farmed here.',
  },
  'drip-line': {
    briefing:
      'Dew falls here in drops the size of your head. It will not kill a Sproutling, only knock it flat and make it drop what it carried. Watch the rhythm. Cross between drops.',
    journal:
      'The drips keep time like a clock. Glowcaps came up after the rain and wilted before I could send anyone. Next time I leave a pair free.',
  },
  'gravelmaws-pit': {
    briefing:
      'The first of the three. A Gravelmaw: plated all over and soft only when it has thrown itself at the ground and missed. Let it miss. It has a shard in its belly that belongs to us.',
    journal:
      'It reared, we scattered, it fell on its face, and thirty Sproutlings landed on it at once. There were tunnels in the walls of that pit. It did not dig them. It came up through them.',
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
      'I gave up trying to watch everything and started trusting the jobs I had already set. The Sproutlings sang on the way home. It may have been squeaking.',
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
      'The river took the old bridge. There are logs enough to build another if your Sproutlings carry them to the bank. Nothing on the far side comes home until it stands.',
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

Object.assign(LESSON_STORY, {
  'the-cistern': {
    briefing:
      'So you found the old cistern. The founders kept the school\u2019s water down here, and rather more of it has got in since. There is a beacon across the channel. Build the bridge first and the rest is half the walk.',
    journal:
      'The twins went into the same flame a breath apart and lit the whole hall, water and all. Someone had scratched tally marks by the channel. Hundreds of them. Lessons, I think.',
  },
  'skitter-warren': {
    briefing:
      'Skitters. A great many, and this is where they come from. They are nothing one at a time and a disaster in a crowd. Throw before they reach you, Warden, not after.',
    journal:
      'Fifteen rooms, and something with too many legs in most of them. We went through it one chamber at a time, lighting as we went. The Sproutlings would like a bath. So would I.',
  },
  'the-root-cellar': {
    briefing:
      'That is where the Lanternroot in the marsh came up from. This is the rest of it. Same rule as before: all three knots, then the bulb. Mind the corners, they are not empty.',
    journal:
      'It was the only light in that cellar until we lit the beacon, and it did not care for the competition. The shelves along the walls still had jars on them. Pickled something. We left those.',
  },
} satisfies Record<string, LessonStory>);

Object.assign(LESSON_STORY, {
  'terrace-gardens': {
    briefing:
      'The Headmaster has been planning these examinations for forty years, Warden, so please look impressed. The terraces are cliffs to you and a short hop to a Sproutling. What they lift comes down by the stairs. Plan for that.',
    journal:
      'Threw a whole squad up a cliff and walked round to meet them at the bottom of the stairs, relic and all. The Headmaster applauded from the gallery. He applauds a lot.',
  },
  'the-long-drop': {
    briefing:
      'Up is a long walk and down is a short fall. The ledges only go one way. A Warden who throws a crew up and lets the ledges bring the relics home will be back in time for tea.',
    journal:
      'Spent the first minute walking up, felt clever, then spent the next minute watching relics tip off the ledge and land almost at the Kiln. Should have done that from the start.',
  },
  'crystal-conservatory': {
    briefing:
      'The doorways are grown shut with crystal. Do not break every one because you can. Break the ones that save more than they cost, and light the outposts beyond them.',
    journal:
      'Broke two doors and left the third. Lit both outposts, and the relics stopped at the nearest flame instead of trekking all the way back. The glass roof was humming by the end of the day.',
  },
  'clockwork-causeway': {
    briefing:
      'Two ways over. The causeway is short and wet and watched. The bridge is safe and has to be built first. Neither is wrong. Doing both at once, badly, is wrong.',
    journal:
      'Built the bridge with the first crew and sent the light hauls over the causeway between drips. The Bogspitters never got a clean shot. I will be hearing that sprinkler in my sleep.',
  },
  'restoration-day': {
    briefing:
      'Everything you have, Warden, on the whole Terrarium in one day. The Headmaster has invited the town. He has invited the town before checking with me. Please do not let them see a Bronze.',
    journal:
      'Every relic home, the Gravelmaw down, and the whole glasshouse lit up like a lantern. The Headmaster cried. So did Ashwick, and blamed the pollen. I did not blame anything.',
  },
} satisfies Record<string, LessonStory>);

/** Shown once, before the first lesson. */
export const PROLOGUE: readonly string[] = [
  'High on a hill above the valley stands the Grand Botanical & Clockwork Academy (everyone calls it the Dandori Academy), half greenhouse, half clockwork, and at its heart the Great Kiln. While the Kiln burns, the frost keeps to the mountains and the dark keeps to the ground.',
  'The Kiln eats Sunshards: splinters of a fallen star. The founders set them into the things they made, the Relics of Harmony, and lost most of them when the old Terrarium under the hill went dark. The Kiln gives back Emberlings, sparks with legs and leafy heads, who will carry anything for whoever holds the whistle.',
  'This year the frost came early and the fire is low. Headmaster Sprocket has one cadet left to train, and Proctor Ashwick to make sure it is done properly. A Warden does not carry relics. A Warden decides who does, and in what order. They call that dandori.',
];

/** Shown after the last of the Grand Curriculum is first cleared. */
export const EPILOGUE: readonly string[] = [
  'The last relic went into the Great Kiln on the evening of Restoration Day, and the old Terrarium lit from end to end: every pane of glass under the hill, every gear in the clock towers, turning together for the first time in a hundred years.',
  'Headmaster Sprocket gave a speech. It was very long and mostly about gears. Proctor Ashwick retired that spring, and left the pocket watch on your desk with a note: \u201cYou never needed it. Try to be on time anyway.\u201d',
  'The Field Guide cabinet is nearly full now. There is one shelf left empty, with a label in the founders\u2019 own hand that just says \u201cnext\u201d. The Sproutlings say they have no idea what it means. They say it very quickly, and all at once.',
];

export function chapterOf(stage: number): Chapter {
  return CHAPTERS.find((chapter) => stage >= chapter.from && stage <= chapter.to) ?? CHAPTERS[0];
}

/**
 * Proctor Ashwick, on the first morning of the story's expedition. The lessons (Time Attack)
 * are the Warden's training; this is the real thing.
 */
export const CAMPAIGN_INTRO =
  'The Great Clock over the gate stopped at midnight, and the beasts have carried its works off into the Wild Quad. Twelve parts, Warden. Nobody is timing you, but the sun still sets: whoever is out in the grass when it does is not coming back. Bring them home before dark, every day, and the Clock will tick again.';
