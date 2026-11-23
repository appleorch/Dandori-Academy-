// Builds the desktop game: `npm run build:desktop [-- win32 linux darwin]` (default: win32).
// Packs dist/ and desktop/main.cjs with Electron into release/, one zip per platform.
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { packager } from '@electron/packager';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const electronVersion = JSON.parse(
  readFileSync('node_modules/electron/package.json', 'utf8'),
).version;
const platforms = process.argv.slice(2).length ? process.argv.slice(2) : ['win32'];

const stage = '.desktop-stage';
rmSync(stage, { recursive: true, force: true });
mkdirSync(stage);
cpSync('dist', `${stage}/dist`, { recursive: true });
cpSync('desktop/main.cjs', `${stage}/main.cjs`);
writeFileSync(
  `${stage}/package.json`,
  JSON.stringify({
    name: 'dandori-academy',
    productName: 'Dandori Academy',
    version: pkg.version,
    main: 'main.cjs',
    author: 'Dandori Academy',
  }),
);

rmSync('release', { recursive: true, force: true });
for (const platform of platforms) {
  const [dir] = await packager({
    dir: stage,
    out: 'release',
    name: 'Dandori Academy',
    executableName: platform === 'linux' ? 'dandori-academy' : 'Dandori Academy',
    platform,
    arch: 'x64',
    electronVersion,
    appVersion: pkg.version,
    appCopyright: 'Dandori Academy',
    asar: true,
    overwrite: true,
    prune: false,
    win32metadata: {
      CompanyName: 'Dandori Academy',
      ProductName: 'Dandori Academy',
      FileDescription: 'Dandori Academy',
    },
  });
  const zip = `release/dandori-academy-${pkg.version}-${platform}-x64.zip`;
  execFileSync('zip', ['-qr9y', `../${zip.slice('release/'.length)}`, '.'], { cwd: dir });
  console.log(`Built ${dir} -> ${zip}`);
}
rmSync(stage, { recursive: true, force: true });
