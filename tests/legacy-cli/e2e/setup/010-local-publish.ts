import { writeFile } from 'node:fs/promises';
import { join } from 'node:path/posix';
import { getGlobalVariable } from '../utils/env';
import { PkgInfo } from '../utils/packages';
import { globalNpm, extractNpmEnv } from '../utils/process';
import { isPrereleaseCli } from '../utils/project';

export default async function () {
  const testRegistry: string = getGlobalVariable('package-registry');
  const packageTars: PkgInfo[] = Object.values(getGlobalVariable('package-tars'));
  const npmrc = join(getGlobalVariable('tmp-root'), '.npmrc-publish');
  await writeFile(
    npmrc,
    `
    ${testRegistry.replace(/^https?:/, '')}/:_authToken=fake-secret
    `,
  );

  // Publish packages specified with --package
  await Promise.all(
    packageTars.map(({ path: p }) =>
      fetch(testRegistry).then(() =>
        globalNpm(['publish', '--tag', isPrereleaseCli() ? 'next' : 'latest', p], {
          ...extractNpmEnv(),
          'NPM_CONFIG_USERCONFIG': npmrc,
        }),
      ),
    ),
  );
}
