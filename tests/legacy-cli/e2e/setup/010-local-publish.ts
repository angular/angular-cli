import { getGlobalVariable } from '../utils/env';
import { npm } from '../utils/process';
import { isPrereleaseCli } from '../utils/project';

export default async function () {
  const testRegistry = getGlobalVariable('package-registry');
  await npm(
    'run',
    'admin',
    '--',
    'publish',
    '--no-versionCheck',
    '--no-branchCheck',
    `--registry=${testRegistry}`,
    '--tag',
    isPrereleaseCli() ? 'next' : 'latest',
  );
}
