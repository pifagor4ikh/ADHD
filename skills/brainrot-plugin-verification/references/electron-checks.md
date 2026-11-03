# Electron bootstrap verification

Use the Node version in `.node-version`. `./scripts/setup.ps1` verifies and unpacks pinned npm inside `.TMP/tooling`, copies the tracked manifest/lock into `.TMP/deps`, runs `npm ci` there and installs the Electron binary. Do not run `npm ci` at the repository root: dependencies belong in `.TMP/deps/node_modules`. To change dependencies deliberately, edit `package.json`, run `./scripts/setup.ps1 -UpdateLock`, review the lockfile, then run normal setup.

Run `node scripts/tasks.mjs typecheck`, `node scripts/tasks.mjs build`, `node --test tests/runtime.test.mjs`, and `node scripts/tasks.mjs smoke`. The smoke check launches a real visible Electron window, verifies local renderer content and absence of renderer Node globals, captures `.TMP/brainrot/smoke.png`, records versions and actual runtime paths in `smoke.json`, then exits. A headless mock cannot replace this check. Inspect the screenshot when UI changes.

Validate a clean checkout under `.TMP`, including a path with spaces, using setup from the tracked lockfile. Keep its caches, dependency tree and outputs under that checkout's `.TMP`. Check the original worktree for unintended files. The bootstrap build is compiled application source, not a packaged installer; video/codec/offline playback and host integrations remain separate gates.
