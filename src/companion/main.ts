import { app, BrowserWindow, session, protocol, dialog, ipcMain } from 'electron';
import { mkdirSync, writeFileSync, appendFileSync } from 'node:fs';
import path from 'node:path';
import { once } from 'node:events';
import { runtimePaths } from './paths';
import { pathToFileURL } from 'node:url';
import { MediaLibrary } from './media';
import { generateFixtures, mediaSmoke } from './media-smoke';

protocol.registerSchemesAsPrivileged([{ scheme: 'brainrot-media', privileges: {
  standard: true, secure: true, stream: true,
} }]);
const library = new MediaLibrary();

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
const fixtures = process.argv.includes('--brainrot-fixtures');
const watchdog = smoke || fixtures ? setTimeout(() => app.exit(1), 60_000) : undefined;
let window: BrowserWindow | undefined;
app.whenReady().then(async () => {
  protocol.handle('brainrot-media', request => library.serve(request));
  const uiDirectory = path.join(__dirname, 'ui');
  const uiURL = pathToFileURL(path.join(uiDirectory, 'index.html')).href;
  const allowedFiles = new Set(['index.html', 'styles.css', 'renderer.js'].map(file => pathToFileURL(path.join(uiDirectory, file)).href));
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  session.defaultSession.setPermissionCheckHandler(() => false);
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    callback({ cancel: !allowedFiles.has(details.url) && !details.url.startsWith('brainrot-media://library/') });
  });
  window = new BrowserWindow({
    width: 1080, height: 680, minWidth: 520, minHeight: 320,
    title: 'Claude Brainrot', backgroundColor: '#14161d',
    show: false,
    webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false, webSecurity: true,
      preload: path.join(__dirname, 'preload.js') },
  });
  let selecting = false;
  let smokeSelection: string[] | undefined;
  ipcMain.handle('media:import', async (event, ...args) => {
    if (!window || event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame ||
        event.senderFrame.url !== uiURL || args.length || selecting) {
      return { canceled: false, items: [], errors: ['Импорт недоступен.'] };
    }
    selecting = true;
    try {
      if (smoke) return await library.importFiles(smokeSelection);
      const result = await dialog.showOpenDialog(window, { title: 'Импорт собственного видео', properties: ['openFile'],
        filters: [{ name: 'Локальные видео', extensions: ['webm', 'mp4'] }] });
      return await library.importFiles(result.canceled ? undefined : result.filePaths);
    } finally { selecting = false; }
  });
  window.removeMenu();
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event) => event.preventDefault());
  window.webContents.on('will-redirect', (event) => event.preventDefault());
  window.webContents.on('will-attach-webview', event => event.preventDefault());
  window.webContents.on('render-process-gone', () => app.exit(1));
  const painted = once(window, 'ready-to-show');
  await window.loadFile(path.join(__dirname, 'ui/index.html'));
  await painted;
  window.show();
  appendFileSync(path.join(paths.logs, 'app.log'), `${new Date().toISOString()} window loaded\n`);
  if (fixtures) {
    await generateFixtures(window, paths.fixtures);
    if (watchdog) clearTimeout(watchdog);
    app.quit();
    return;
  }
  if (smoke) {
    const media = await mediaSmoke(window, library, paths.fixtures, selected => { smokeSelection = selected; });
    const state = await window.webContents.executeJavaScript(`({
      title: document.title,
      heading: document.querySelector('h1')?.textContent,
      nodeExposed: typeof process !== 'undefined' || typeof require !== 'undefined',
      bridgeKeys: Object.keys(window.brainrot),
      environment: window.brainrot.environment
    })`);
    if (state.title !== 'Claude Brainrot' || state.heading !== 'Claude Brainrot' || state.nodeExposed || !window.isVisible()) {
      throw new Error('Desktop smoke check failed');
    }
    if (!state.environment.sandboxed || !state.environment.contextIsolated ||
        state.bridgeKeys.join(',') !== 'importVideos,environment') throw new Error('Unsafe renderer settings');
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
    writeFileSync(path.join(paths.root, 'smoke.json'), JSON.stringify({ state, media, actualPaths, versions: process.versions }, null, 2));
    if (watchdog) clearTimeout(watchdog);
    app.quit();
  }
}).catch(error => {
  appendFileSync(path.join(paths.logs, 'app.log'), `${String(error)}\n`);
  console.error(error);
  app.exit(1);
});
app.on('window-all-closed', () => app.quit());
