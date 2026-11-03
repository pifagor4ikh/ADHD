import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync, cpSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
const tmp = path.join(root, '.TMP');
mkdirSync(path.join(tmp, 'tmp'), { recursive: true });
const env = { ...process.env, TEMP: path.join(tmp, 'tmp'), TMP: path.join(tmp, 'tmp'),
  ELECTRON_CACHE: path.join(tmp, 'electron-cache') };
delete env.ELECTRON_RUN_AS_NODE;
Object.assign(process.env, env);
delete process.env.ELECTRON_RUN_AS_NODE;
const run = (executable, args, timeout = 120_000) => {
  const result = spawnSync(executable, args, { cwd: root, env, stdio: 'inherit', timeout });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
};
const task = process.argv[2];
if (!['build', 'typecheck', 'dev', 'smoke'].includes(task)) throw new Error('Unknown task');
run(process.execPath, [path.join(tmp, 'deps/node_modules/typescript/bin/tsc'),
  '-p', 'tsconfig.json', ...(task === 'typecheck' ? ['--noEmit'] : [])]);
if (task === 'typecheck') process.exit(0);
cpSync('src/companion/ui', '.TMP/build/companion/ui', { recursive: true });
writeFileSync('.TMP/build/package.json', JSON.stringify({ name: 'claude-brainrot', version: '0.1.0', main: 'companion/main.js' }));
if (task === 'build') process.exit(0);
const require = createRequire(path.join(tmp, 'deps/package.json'));
if (!existsSync(path.join(tmp, 'deps/node_modules/electron/dist/electron.exe'))) {
  throw new Error('Run ./scripts/setup.ps1 to install the Electron binary first.');
}
run(require('electron'), [path.join(tmp, 'build'), ...(task === 'smoke' ? ['--brainrot-smoke'] : [])], task === 'dev' ? 0 : 120_000);
