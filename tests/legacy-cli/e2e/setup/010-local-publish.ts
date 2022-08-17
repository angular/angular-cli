import { getGlobalVariable } from '../utils/env';
import { PkgInfo } from '../utils/packages';
import { globalNpm, extractNpmEnv } from '../utils/process';
import { isPrereleaseCli } from '../utils/project';

export default async function () {
  const testRegistry: string = getGlobalVariable('package-registry');
  const packageTars: PkgInfo[] = Object.values(getGlobalVariable('package-tars'));

  // Publish packages specified with --package
  await Promise.all(
    packageTars.map(({ path: p }) =>
      globalNpm(
        [
          'publish',
          `--registry=${testRegistry}`,
          '--tag',
          isPrereleaseCli() ? 'next' : 'latest',
          p,
        ],
        {
          ...extractNpmEnv(),
          // Also set an auth token value for the local test registry which is required by npm 7+
          // even though it is never actually used.
          'NPM_CONFIG__AUTH': 'e2e-testing',
        },
      ),
    ),
  );
}
