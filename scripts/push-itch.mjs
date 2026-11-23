// Uploads the game to itch.io with butler: `npm run deploy:itch` (web build only), or
// `node scripts/push-itch.mjs web win32 linux` after `npm run build:desktop -- win32 linux`.
// Needs butler on PATH (or BUTLER=/path/to/butler) and BUTLER_API_KEY set.
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

export const ITCH_GAME = 'sgtseamonkey/dandori-academy';
const CHANNELS = {
  web: { dir: 'dist', channel: 'html5' },
  win32: { dir: 'release/Dandori Academy-win32-x64', channel: 'windows' },
  linux: { dir: 'release/Dandori Academy-linux-x64', channel: 'linux' },
};

const version = JSON.parse(readFileSync('package.json', 'utf8')).version;
const butler = process.env.BUTLER || 'butler';
const targets = process.argv.slice(2).length ? process.argv.slice(2) : ['web'];

for (const target of targets) {
  const spec = CHANNELS[target];
  if (!spec) throw new Error(`Unknown target ${target}: use ${Object.keys(CHANNELS).join(', ')}.`);
  if (!existsSync(spec.dir)) throw new Error(`${spec.dir} is missing: build it first.`);
  console.log(`Pushing ${spec.dir} to ${ITCH_GAME}:${spec.channel} (${version})`);
  execFileSync(
    butler,
    ['push', spec.dir, `${ITCH_GAME}:${spec.channel}`, '--userversion', version],
    { stdio: 'inherit' },
  );
}
