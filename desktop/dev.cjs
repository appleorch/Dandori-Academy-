// `npm run desktop`: runs the desktop window against the fresh dist/ without packing it.
const path = require('node:path');
const fs = require('node:fs');
const stage = path.join(__dirname, '..', '.desktop-stage');
fs.rmSync(stage, { recursive: true, force: true });
fs.mkdirSync(stage);
fs.cpSync(path.join(__dirname, '..', 'dist'), path.join(stage, 'dist'), { recursive: true });
fs.cpSync(path.join(__dirname, 'main.cjs'), path.join(stage, 'main.cjs'));
require(path.join(stage, 'main.cjs'));
