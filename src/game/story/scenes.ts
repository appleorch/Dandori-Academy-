/**
 * The story's scenes: short moments played in the world at the story's beats, scripted as
 * data. Each line is spoken by a character with a portrait, while the camera looks where the
 * line says; the day waits while a scene plays, and any click, the whistle or the interact key
 * moves it on (the Skip button ends it). Who these people are, and where they are going, is in
 * docs-design/STORY_BIBLE.md.
 */

export type Speaker = 'sprocket' | 'ashwick' | 'tindle' | 'quill' | 'warden';

/** Where the camera looks while a line is spoken. */
export type SceneCamera = 'warden' | 'kiln' | 'wide' | { x: number; z: number };

export interface SceneLine {
  who: Speaker;
  text: string;
  camera?: SceneCamera;
  /** Seconds the line stays before the next, unless moved on sooner. */
  seconds?: number;
}

export interface Scene {
  id: string;
  lines: readonly SceneLine[];
}

export const SPEAKER_NAMES: Record<Speaker, string> = {
  sprocket: 'Headmaster Sprocket',
  ashwick: 'Proctor Ashwick (on the radio)',
  tindle: 'Tindle',
  quill: 'Warden Quill',
  warden: 'You',
};

/** Seconds a line stays when it does not say. */
export const LINE_SECONDS = 4.5;

/** The first morning of the story, in the Wild Quad. */
const FIRST_MORNING: Scene = {
  id: 'first-morning',
  lines: [
    {
      who: 'sprocket',
      camera: 'wide',
      text: 'Ah. Yes. The Quad. It was a lawn once, you know. With a bench. I sat on the bench.',
    },
    {
      who: 'sprocket',
      camera: 'kiln',
      text: 'The Great Clock has stopped, Warden, and its parts have been carried off by every beast in the grounds. Term begins in thirty days. It would be nice if the Clock did too.',
    },
    {
      who: 'ashwick',
      text: 'Ashwick here. I am told I am “retired”. I am also told the radio still works. Your sprouts are in the ground by the Kiln: pluck them, then get to work.',
    },
    {
      who: 'tindle',
      camera: 'warden',
      text: 'Tindle! First up, first out. Point me at something heavy.',
    },
  ],
};

/** The first day in each section after the Quad. */
const OPENINGS: Record<string, Scene> = {
  orchard: {
    id: 'open-orchard',
    lines: [
      {
        who: 'sprocket',
        camera: 'wide',
        text: 'The old orchard. The cistern burst the year the Clock stopped. I had meant to mention that. I did not.',
      },
      {
        who: 'ashwick',
        text: 'Water everywhere. Dewlings swim, everyone else sinks. Plan accordingly.',
      },
      {
        who: 'tindle',
        camera: 'warden',
        text: 'I do not swim. I would like that on the record.',
      },
    ],
  },
  foundry: {
    id: 'open-foundry',
    lines: [
      {
        who: 'quill',
        camera: 'warden',
        text: 'Well, well. The Academy’s new Warden. Quill. You will have seen me on the battle boards, near the top.',
      },
      {
        who: 'quill',
        text: 'I came for the Clock too. Someone has to fix it properly. But the belts here do whatever they like, and so, it seems, do the fires.',
      },
      {
        who: 'sprocket',
        camera: 'wide',
        text: 'Quill! You came back. Good. Two Wardens are better than one, and considerably better than none.',
      },
      {
        who: 'ashwick',
        text: 'Mind the vents. Send Emberlings. And do not race Quill; you will both lose.',
      },
    ],
  },
  observatory: {
    id: 'open-observatory',
    lines: [
      {
        who: 'sprocket',
        camera: 'wide',
        text: 'The Observatory. I should tell you why the Clock stopped, Warden. I wound it, the night before term, a hundred years ago this autumn. I was in a hurry. I wound it the wrong way.',
      },
      {
        who: 'sprocket',
        text: 'The old clockwork Warden tried to set it right, and went wrong itself. It has been keeping the Clock’s heart ever since, waiting for someone to wind things properly.',
      },
      {
        who: 'ashwick',
        text: 'That is the first time he has said so out loud. Take every kind you have. You will need them all.',
      },
      {
        who: 'quill',
        camera: 'warden',
        text: 'I will hold the halls. You go under the dome. And Warden: wind it the right way round.',
      },
    ],
  },
};

/** What is said as a part comes home: one line, by how many are home in all. */
const PART_LINES: readonly SceneLine[] = [
  {
    who: 'sprocket',
    text: 'One part home! The Clock gave a little shiver. I felt it from my office.',
  },
  { who: 'tindle', text: 'That one was heavy. I was magnificent.' },
  { who: 'ashwick', text: 'Good. Keep the squad together and the next one will come quicker.' },
  {
    who: 'sprocket',
    text: 'Another! At this rate the pigeons will have to find somewhere else to sit.',
  },
  { who: 'ashwick', text: 'Not bad, Warden. Not bad at all.' },
  { who: 'tindle', text: 'Do I get a medal? I would like a small one, on a ribbon.' },
  {
    who: 'sprocket',
    text: 'The hands moved! Only a little. Possibly the wind. I choose to believe it was not the wind.',
  },
  {
    who: 'ashwick',
    text: 'I trained a great many Wardens. You are, I am obliged to admit, one of the better ones.',
  },
  {
    who: 'sprocket',
    text: 'Half the Clock, and the courtyard sounds different already. Like a held breath.',
  },
  { who: 'tindle', text: 'I have bloomed! Look! A flower! On my head!' },
  { who: 'ashwick', text: 'I am proud of you, Warden. Do not tell the Headmaster I said so.' },
  { who: 'sprocket', text: 'Nearly there. I have polished the bell. Twice.' },
];

export function openingScene(section: string): Scene | null {
  if (section === 'quad') return FIRST_MORNING;
  return OPENINGS[section] ?? null;
}

/** The short scene as the `count`-th part comes home (1-based): the Kiln, and a line. */
export function partScene(count: number, partName: string): Scene {
  const line = PART_LINES[(count - 1) % PART_LINES.length];
  return {
    id: `part-${count}`,
    lines: [
      { who: 'warden', camera: 'kiln', text: `${partName}, home.`, seconds: 2.5 },
      { ...line, camera: 'kiln' },
    ],
  };
}

/** The first of each kind brought into the story: a word from Tindle and Ashwick. */
export const KIND_SCENES: Record<'dew' | 'stone' | 'spark', Scene> = {
  dew: {
    id: 'kind-dew',
    lines: [
      {
        who: 'tindle',
        camera: 'kiln',
        text: 'A Dewling! Look at it, all damp and pleased with itself.',
      },
      {
        who: 'ashwick',
        text: 'Dewlings wade where the rest of you drown. The pond is theirs. So are the drips.',
      },
    ],
  },
  stone: {
    id: 'kind-stone',
    lines: [
      { who: 'tindle', camera: 'kiln', text: 'That one is heavy. That one is a Stoneling.' },
      {
        who: 'ashwick',
        text: 'Stonelings lift like two, and they are the only ones who crack crystal. Mind the vault.',
      },
    ],
  },
  spark: {
    id: 'kind-spark',
    lines: [
      { who: 'tindle', camera: 'kiln', text: 'Ow. It bit me. It is crackling.' },
      {
        who: 'ashwick',
        text: 'A Sparkling. Sparks cannot hurt it, and it flies farthest when thrown. Use that.',
      },
    ],
  },
};
