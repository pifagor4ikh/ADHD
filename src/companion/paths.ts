import path from 'node:path';

export function runtimePaths(projectRoot: string) {
  const root = path.join(projectRoot, '.TMP', 'brainrot');
  return {
    root,
    userData: path.join(root, 'user-data'),
    sessionData: path.join(root, 'session-data'),
    logs: path.join(root, 'logs'),
    crashDumps: path.join(root, 'crash-dumps'),
    temp: path.join(root, 'tmp'),
    fixtures: path.join(root, 'fixtures'),
  };
}
