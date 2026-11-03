import { app, BrowserWindow, session } from 'electron';
import { mkdirSync, writeFileSync, appendFileSync } from 'node:fs';
import path from 'node:path';
import { once } from 'node:events';
import { runtimePaths } from './paths';

// Compiled entry lives at <project>/.TMP/build/companion/main.js.
const projectRoot = path.resolve(__dirname, '../../..');
const paths = runtimePaths(projectRoot);
for (const directory of Object.values(paths)) mkdirSync(directory, { recursive: true });
// Configure before ready so Chromium never initializes its default profile.
app.setPath('appData', paths.root);
for (const key of ['userData', 'sessionData', 'logs', 'crashDumps', 'temp'] as const) {
  app.setPath(key, paths[key]);
}
app.setAppLogsPath(paths.logs);
app.commandLine.appendSwitch('disk-cache-dir', path.join(paths.sessionData, 'Cache'));
app.commandLine.appendSwitch('disable-component-update');
app.commandLine.appendSwitch('disable-background-networking');
app.commandLine.appendSwitch('log-file', path.join(paths.logs, 'chromium.log'));

const smoke = process.argv.includes('--brainrot-smoke');
const watchdog = smoke ? setTimeout(() => app.exit(1), 20_000) : undefined;
let window: BrowserWindow | undefined;
app.whenReady().then(async () => {
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    callback({ cancel: !details.url.startsWith('file:') });
  });
  window = new BrowserWindow({
    width: 860, height: 480, minWidth: 520, minHeight: 320,
    title: 'Claude Brainrot', backgroundColor: '#14161d',
    show: false,
    webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false, webSecurity: true },
  });
  window.removeMenu();
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event) => event.preventDefault());
  window.webContents.on('render-process-gone', () => app.exit(1));
  const painted = once(window, 'ready-to-show');
  await window.loadFile(path.join(__dirname, 'ui/index.html'));
  await painted;
  window.show();
  appendFileSync(path.join(paths.logs, 'app.log'), `${new Date().toISOString()} window loaded\n`);
  if (smoke) {
    const state = await window.webContents.executeJavaScript(`({
      title: document.title,
      heading: document.querySelector('h1')?.textContent,
      nodeExposed: typeof process !== 'undefined' || typeof require !== 'undefined'
    })`);
    if (state.title !== 'Claude Brainrot' || state.heading !== 'Claude Brainrot' || state.nodeExposed || !window.isVisible()) {
      throw new Error('Desktop smoke check failed');
    }
    const actualPaths = Object.fromEntries(['appData', 'userData', 'sessionData', 'logs', 'crashDumps', 'temp'].map(
      key => [key, app.getPath(key as 'userData')],
    ));
    if (Object.values(actualPaths).some(value => !value.startsWith(paths.root + path.sep) && value !== paths.root)) {
      throw new Error('Runtime path escaped .TMP');
    }
    await window.webContents.executeJavaScript('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
    const screenshot = await window.webContents.capturePage();
    if (screenshot.isEmpty()) throw new Error('Empty desktop screenshot');
    writeFileSync(path.join(paths.root, 'smoke.png'), screenshot.toPNG());
    writeFileSync(path.join(paths.root, 'smoke.json'), JSON.stringify({ state, actualPaths, versions: process.versions }, null, 2));
    if (watchdog) clearTimeout(watchdog);
    app.quit();
  }
}).catch(error => {
  appendFileSync(path.join(paths.logs, 'app.log'), `${String(error)}\n`);
  console.error(error);
  app.exit(1);
});
app.on('window-all-closed', () => app.quit());
