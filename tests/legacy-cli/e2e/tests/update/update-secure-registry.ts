import { ng } from '../../utils/process';
import { createNpmConfigForAuthentication } from '../../utils/registry';
import { expectToFail } from '../../utils/utils';
import { isPrereleaseCli } from '../../utils/project';

export default async function () {
  // The environment variable has priority over the .npmrc
  delete process.env['NPM_CONFIG_REGISTRY'];
  const worksMessage = 'We analyzed your package.json';

  const extraArgs = [];
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
}
