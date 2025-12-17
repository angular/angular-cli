import { exec, ng } from '../../utils/process';
import { createNpmConfigForAuthentication } from '../../utils/registry';
import { expectToFail } from '../../utils/utils';
import { isPrereleaseCli } from '../../utils/project';
import { getActivePackageManager } from '../../utils/packages';
import assert from 'node:assert';

export default async function () {
  // The environment variable has priority over the .npmrc
  delete process.env['NPM_CONFIG_REGISTRY'];
  const worksMessage = 'We analyzed your package.json';

  const extraArgs: string[] = [];
  if (isPrereleaseCli()) {
    extraArgs.push('--next');
  }

  // Valid authentication token
  await createNpmConfigForAuthentication(false);
  const { stdout: stdout1 } = await ng('update', ...extraArgs);
  if (!stdout1.includes(worksMessage)) {
    throw new Error(`Expected stdout to contain "${worksMessage}"`);
  }

  await createNpmConfigForAuthentication(true);
  const { stdout: stdout2 } = await ng('update', ...extraArgs);
  if (!stdout2.includes(worksMessage)) {
    throw new Error(`Expected stdout to contain "${worksMessage}"`);
  }

  // Invalid authentication token
  await createNpmConfigForAuthentication(false, true);
  await expectToFail(() => ng('update', ...extraArgs));

  await createNpmConfigForAuthentication(true, true);
  await expectToFail(() => ng('update', ...extraArgs));

  if (getActivePackageManager() === 'yarn') {
    // When running `ng update` using yarn (`yarn ng update`), yarn will set the `npm_config_registry` env variable to `https://registry.yarnpkg.com`
    // Validate the registry in the RC is used.
    await createNpmConfigForAuthentication(true, true);

    const error = await expectToFail(() => exec('yarn', 'ng', 'update', ...extraArgs));
    assert.match(error.message, /not allowed to access package/);
  }
}
