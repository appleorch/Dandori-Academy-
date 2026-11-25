/**
 * The interface's English, the source every other language is translated from. Keys are
 * grouped by screen. Placeholders in braces, like `{day}`, are filled in by `t`. Keep whole
 * sentences in one message, never glued from pieces, so a translation can reorder them.
 */
export const EN = {
  // The tabs across the top of every menu.
  'nav.crest': 'The Academy crest',
  'nav.title': 'Dandori Academy',
  'nav.label': 'Menu',
  'nav.menu': 'Main menu',
  'nav.camp': 'Story',
  'nav.map': 'Time Attack',
  'nav.challenges': 'Challenges',
  'nav.battles': 'Battles',
  'nav.journal': 'Journal',
  'nav.guide': 'Field Guide',
  'nav.leaderboard': 'Leaderboard',
  'nav.achievements': 'Achievements',
  'nav.settings': 'Settings',
  'nav.wardrobe': 'Wardrobe',
  'nav.extras': 'Extras',
  'nav.play': 'Play',
  'nav.credits': 'Credits',
  'nav.backRoom': '♠ Back room',

  // The title screen.
  'title.tagline': 'The Grand Botanical & Clockwork Academy',
  'title.press': 'Press any key',

  // The main menu.
  'menu.extras': 'Extras',
  'menu.title': 'Dandori Academy',
  'menu.subtitleFirst': 'The Grand Botanical & Clockwork Academy. Your first day.',
  'menu.subtitle': 'The Grand Botanical & Clockwork Academy · Story day {day}',
  'menu.beginStory': 'Begin the story',
  'menu.continueStory': 'Continue the story',
  'menu.storyWhere': '{section} · day {day}',
  'menu.timeAttackNext': 'Time Attack: {lesson}',
  'menu.card.story': 'Story',
  'menu.card.storyDetail': '{section} · day {day} · {parts} of {total} Clock parts',
  'menu.card.timeAttack': 'Time Attack',
  'menu.card.timeAttackDetail': '{cleared} of {total} lessons cleared',
  'menu.card.challenges': 'Challenges',
  'menu.card.challengesBlurb':
    '{count} challenges with twelve fields each, built for their own rules: {names}.',
  'menu.card.challengesDetail': '{medals} of {total} fields with a medal',
  'menu.card.battles': 'Battles',
  'menu.card.battlesBlurb': 'Race a rival Warden on a copy of a lesson: {names}.',
  'menu.card.battlesDetail': '{won} won · {lost} lost',

  // The pause menu.
  'pause.title': 'Paused',
  'pause.resume': 'Resume',
  'pause.callItADay': 'Call it a day',
  'pause.callItADayNote': 'Sproutlings away from the Kiln and the lit beacons are lost',
  'pause.concede': 'Concede the battle',
  'pause.endNow': 'End the day now',
  'pause.restart': 'Restart',
  'pause.manual': 'Manual',
  'pause.settings': 'Settings',
  'pause.quit': 'Quit',
  'pause.back': 'Back',

  // The story's base camp.
  'camp.title': 'Story',
  'camp.day': 'Day {day}',
  'camp.partsHome': '{count} of {total} Clock parts home',
  'camp.relics': '{count} of {total} relics',
  'camp.beasts': '{count} of {total} beasts beaten',
  'camp.losses': '{lost} Sproutlings lost so far, {night} of them to the night',
  'camp.eyebrow': 'Base camp',
  'camp.finished':
    'Every part of this section is home, the last on day {day}. It still holds relics and beasts for anyone who wants to finish the job.',
  'camp.kiln': 'In the Kiln',
  'camp.kilnLabel': 'The Kiln’s stock',
  'camp.kilnEmpty': 'The Kiln is empty. It will coax out a single Emberling to start again with.',
  'camp.overflow': '{going} go out (the field holds no more); {waiting} wait in the Kiln.',
  'camp.begin': 'Begin the expedition',
  'camp.startDay': 'Start day {day}',
  'camp.sunsetNote': 'Bring your Sproutlings back to the Kiln or a lit beacon before the sun sets.',
  'camp.clock': 'The Great Clock',
  'camp.missingPart': 'A missing part',
  'camp.stillOut': 'Still out in {section}.',
  'camp.partHome': '{description} Home on day {day}.',
  'camp.partHomeOn': '(home on day {day})',
  'camp.mapLabel':
    'Map of {section}: the Kiln, the Great Clock parts still out, and what has been opened up',
  'camp.kilnMark': 'Kiln',
  'camp.startOver': 'Start the expedition over',
  'camp.startOverWarning':
    'Every part, relic, gate, bridge and Sproutling of the expedition is lost. Achievements and everything else are kept.',
  'camp.startOverConfirm': 'Start over from day 1',
  'camp.keepGoing': 'Keep going',
  'camp.startOverAsk': 'Start over…',
  'camp.daysLeft': '{days} days until term',
  'camp.plan': 'Who goes out',
  'camp.complete': '({percent}% done)',
  'camp.pinHint': 'Click the map to pin a spot; click a pin to take it away.',
  'camp.planNote': 'How many of each kind to take tomorrow; the rest wait in the Kiln.',
  'camp.planEveryone': 'Send everyone',
  'camp.history': 'The Kiln, day by day',
  'camp.items': 'Sprays in hand: {ember} Emberbrew, {still} Stillwater',
  'camp.daysOver': 'Term has begun',
  'camp.relaxed': 'Relaxed: no day limit',
  'camp.allParts': '{count} of {total} Clock parts home in all',
  'camp.explored': '{percent}% explored',
  'camp.grounds': 'The grounds',
  'camp.sectionHere': 'Exploring now',
  'camp.sectionGo': 'Explore from tomorrow',
  'camp.sectionLocked': 'Opens with {count} Clock parts home',
  'camp.gifts': 'The Clock’s gifts',
  'camp.giftNext': 'The next part home brings: {name}',
  'camp.needsGift': 'Out of reach for now: you will need {gift}.',
  'camp.noRadar': 'Parts still out will show on the map once the Clock can chime for them.',
  'gift.radar.name': 'The Chime of Finding',
  'gift.radar.text': 'Parts still out show on the base camp map, wherever you have explored.',
  'gift.whistle.name': 'The Long Whistle',
  'gift.whistle.text': 'Your whistle reaches a third further.',
  'gift.kiln.name': 'The Kiln’s Second Wind',
  'gift.kiln.text': 'The Kiln grows new Sproutlings far quicker.',
  'gift.carry.name': 'The Even Keel',
  'gift.carry.text': 'Every haul is carried a tenth faster.',
  'gift.sunset.name': 'The Evening Bell',
  'gift.sunset.text':
    'At sunset, Sproutlings make it home from half as far again round the Kiln and the beacons.',
  'gift.bridgekit.name': 'The Bridgewright’s Kit',
  'gift.bridgekit.text': 'Every Span-log laid at a bridge counts twice.',
  'gift.lantern.name': 'The Clock Lantern',
  'gift.lantern.text': 'Caves are lit, and what needed the light can be reached.',
  'ending.golden.title': 'The First Bell of Term',
  'ending.golden.text':
    'On the first morning of term the Great Clock strikes eight, a little rusty and entirely on time. The new year files in under it without a second glance, which is exactly as it should be. The Headmaster pretends he never doubted you. Proctor Ashwick, for once, says nothing at all, and nods.',
  'ending.late.title': 'Better Late',
  'ending.late.text':
    'The Clock strikes at last, some days into term, to a courtyard of students who had stopped expecting it. A cheer goes up anyway. The Headmaster calls it “fashionably punctual”. Ashwick calls it a lesson in planning, and then, quietly, a job well done.',
  'ending.silent.title': 'A Silent Term',
  'ending.silent.text':
    'Term begins under a Clock that will not strike. Lessons start whenever somebody remembers. It is not the end of the world, only of the deadline: the grounds are still out there, and so are the parts. Bring them home, and the Clock will strike when it is ready.',
  'ending.carryOn': 'Carry on',
  'ending.credits': 'Roll the credits',
  'ending.postGame':
    'The grounds stay open: every relic, beast and corner still to find is waiting for you.',
  'ending.eyebrow': 'An ending',

  // Choosing a challenge field.
  'challenges.title': 'Challenges',
  'challenges.label': 'Challenge',
  'challenges.note':
    'Twelve fields, each built for this challenge. Medals run Bronze, Silver, Gold, Platinum and Diamond; Platinum is set by the Academy’s test player on each field. Glowcaps add to a score but are never needed for a medal.',
  'challenges.progress': '{won} of {total} fields with a medal',
  'challenges.platinumScore': 'Platinum {score}',
  'challenges.points': '{score} pts',
  'challenges.pace.growing': 'Platinum: {count} Sproutlings by sunset',
  'challenges.pace.trialNone': 'Platinum: lose nobody',
  'challenges.pace.trial': 'Platinum: lose {count} or fewer',
  'challenges.pace.timed': 'Platinum pace {time}',
  'challenges.locked': 'Win any medal on {field} to open this field.',

  // Loading, errors and the save.
  'loading.screen': 'Loading…',
  'loading.kiln': 'Stoking the Kiln…',
  'error.eyebrow': 'Something went wrong',
  'error.title': 'The view of the field stopped working',
  'error.body':
    'This can happen when the graphics driver resets. Trying again usually works; a lower graphics setting can help if it keeps happening.',
  'error.noted': 'The error was noted in Settings, under the error log.',
  'error.retry': 'Try again',
  'error.back': 'Back to the menu',
  'errorLog.title': 'Error log',
  'errorLog.none':
    'No errors noted. If something goes wrong, it is noted here, on this device only, to paste into a bug report.',
  'errorLog.some': '{count} errors noted on this device, the latest on {when}.',
  'errorLog.one': '1 error noted on this device, on {when}.',
  'errorLog.copy': 'Copy the log',
  'errorLog.copied': 'Copied',
  'errorLog.clear': 'Clear',
  'recovery.eyebrow': 'Your save',
  'recovery.title': 'Your progress could not be read',
  'recovery.body':
    'The saved progress in this browser is damaged, or from a version this one cannot read. It has been kept safe, untouched, and a new save started so you can play.',
  'recovery.note':
    'Download it to keep a copy, or to send with a bug report. If you have a save file from Settings, you can load it there.',
  'recovery.download': 'Download the old save',
  'recovery.fresh': 'Start fresh',

  // Language.
  'language.title': 'Language',
  'language.hint': 'The language of menus and the game’s text.',

  // The credits.
  'credits.title': 'Credits',
  'credits.intro':
    'Dandori Academy: a game about planning work so that nobody stands idle, in the spirit of the classics of the genre.',
  'credits.made': 'Made by',
  'credits.madeBody': 'Designed and directed by its creator, built with Claude by Anthropic.',
  'credits.tech': 'Built with',
  'credits.techBody':
    'React, three.js and React Three Fiber, Rapier physics, Zustand, Vite, Vitest and Playwright. Every model, texture, sound and tune in the game is made by its own code at run time.',
  'credits.thanks': 'Thanks',
  'credits.thanksBody':
    'To everyone who plays, posts a run to the Academy board, or files a bug report. And to the Sproutlings, who carried all of it.',
  'credits.version': 'Version {version}',
} as const;

export type MessageKey = keyof typeof EN;
