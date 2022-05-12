import { getGlobalVariable } from '../utils/env';
import { execWithEnv, extractNpmEnv } from '../utils/process';
import { isPrereleaseCli } from '../utils/project';

export default async function () {
  const testRegistry: string = getGlobalVariable('package-registry');
  await execWithEnv(
    'npm',
    [
      'run',
      'admin',
      '--',
      'publish',
      '--no-versionCheck',
      '--no-branchCheck',
      `--registry=${testRegistry}`,
      '--tag',
      isPrereleaseCli() ? 'next' : 'latest',
    ],
    {
      ...extractNpmEnv(),
      // Also set an auth token value for the local test registry which is required by npm 7+
      // even though it is never actually used.
      'NPM_CONFIG__AUTH': 'e2e-testing',
    },
  );
}
