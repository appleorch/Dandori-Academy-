# Dandori Academy: story bible

The reference for who is in the story, what they want, and how they talk. Every line of dialogue
in the game (`src/game/story/`) should sound like it belongs here. When a line and this document
disagree, change one of them on purpose.

## The premise

The Great Clock over the Academy's gate has stopped, and the beasts of the grounds have carried
its forty-two parts off into the four sections around it: the Wild Quad, the Sunken Orchard, the
Clockwork Foundry and the Frostglass Observatory. Term begins in thirty days. The Warden, newly
qualified, sets out with a Kiln, ten Emberlings and a radio to bring the Clock home.

## The tone

Dry, warm and British. People understate. Disasters are described calmly; small victories with
slightly too much ceremony. Nobody is cruel. Jokes come from character, never at the player's
expense. Sentences are short. No exclamation marks from Ashwick, ever; plenty from Tindle.

## The characters

### The Warden (you)

Silent, but chosen. The Warden never speaks aloud; their only lines are what they would note in
the log ("The Click Spring, home."). Everyone else talks to them as someone capable who has not
yet realised it. By the end the Academy treats them as one of its own.

### Proctor Ashwick

The strict mentor of the lessons (Time Attack), who retires at the end of them. In the story he
is a voice on the radio, "retired", who cannot stop himself checking in. Arc: from clipped orders
to a quiet, reluctant pride ("I am proud of you, Warden. Do not tell the Headmaster I said so.").
Voice: low, flat, practical. Never wastes a word. Never uses an exclamation mark.

### Headmaster Sprocket

Comic, fond of the sound of his own voice, and genuinely kind. The Clock was his responsibility:
**he wound it the wrong way, in a hurry, the night before term a hundred years ago**, and the old
clockwork Warden that tried to set it right went wrong itself. He admits it on the first day in
the Observatory. Arc: from bluster to confession to relief. Voice: warm, wandering, given to
digressions about benches and pigeons.

### Tindle

The first Emberling, first plucked on the first morning, and the Warden's companion through the
story. Brave, vain, delighted by everything, and slightly worried about water. Arc: grows from
leaf to bloom over the story (the growth stages), and from showing off to looking after the
others. Voice: high, quick, very sure of itself.

### Warden Quill

The rival Warden from the battles, met in the Foundry. Competent, proud, a little prickly, and
there for the same reason as you. Arc: from rival to ally; holds the Observatory's halls while you
go under the dome. Voice: clipped, confident, the occasional dry aside.

### The Hollow Warden

The Academy's old clockwork Warden, the final boss. Not evil: it is still trying to keep the
Clock, the only way it knows. Beaten, it winds down gently. Its relic is the key that wound the
Clock wrong.

## The beats

| Beat                     | Where                         | Scene                                                                                        |
| ------------------------ | ----------------------------- | -------------------------------------------------------------------------------------------- |
| The first morning        | Wild Quad, day 1              | Sprocket sets the task; Ashwick on the radio; Tindle plucked first                           |
| Each section's first day | Orchard, Foundry, Observatory | The section introduced; Quill met in the Foundry; Sprocket's confession in the Observatory   |
| Each part's return       | Any section                   | The Kiln, the part's name, and a line from Sprocket, Ashwick or Tindle, by how many are home |
| Each boss                | First time roused on a field  | Intro card with its name and title                                                           |
| The endings              | Base camp                     | The Great Clock in the courtyard, the ending's words, the credits                            |

The three endings (`src/game/campaign/endings.ts`): every part home within thirty days (the first
bell of term), every part home late (better late), or the limit passing with parts still out (a
silent term, after which the story continues).

## The Warden's log

At the end of every story day the Warden writes an entry (`src/game/story/wardenLog.ts`): what
was found, beaten, built and lost, in plain short sentences, owning up to losses. It reads like a
competent person's notebook, not a scoreboard.

## Notes

Every boss has two notes in the Field Guide: the Warden's (practical) and the Headmaster's (a
story about it, usually his fault). Every Clock part has a description in the Headmaster's voice
(`CLOCK_PARTS` in `src/game/story/relics.ts`), and the base camp records the day it came home.
Beast entries in the Field Guide open once that beast has been beaten.
