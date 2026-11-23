// The desktop build of Dandori Academy: the web build (dist/) in its own window.
// Built by `npm run build:desktop` (scripts/build-desktop.mjs).
const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('node:path');

// Use the fast GPU on laptops with two, and WebGL even on GPUs Chromium is unsure of.
app.commandLine.appendSwitch('force_high_performance_gpu');
app.commandLine.appendSwitch('ignore-gpu-blocklist');

function createWindow() {
  const win = new BrowserWindow({
    width: 1600,
    height: 900,
    minWidth: 960,
    minHeight: 540,
    backgroundColor: '#10140f',
    title: 'Dandori Academy',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  });
  win.once('ready-to-show', () => win.show());
  win.loadFile(path.join(__dirname, 'dist', 'index.html'));

  // Links (the leaderboard's, the README's) open in the player's browser, not in the game.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file:')) {
      event.preventDefault();
      if (/^https?:/.test(url)) shell.openExternal(url);
    }
  });

  // F11 toggles full screen; F12 opens the developer tools.
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11') {
      win.setFullScreen(!win.isFullScreen());
      event.preventDefault();
    } else if (input.key === 'F12') {
      win.webContents.toggleDevTools();
      event.preventDefault();
    }
  });
}

Menu.setApplicationMenu(null);
app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
