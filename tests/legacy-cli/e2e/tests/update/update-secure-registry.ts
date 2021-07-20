import { ng } from '../../utils/process';
import { createNpmConfigForAuthentication } from '../../utils/registry';
import { expectToFail } from '../../utils/utils';

export default async function () {
  // The environment variable has priority over the .npmrc
  let originalRegistryVariable;
  if (process.env['NPM_CONFIG_REGISTRY']) {
    originalRegistryVariable = process.env['NPM_CONFIG_REGISTRY'];
    delete process.env['NPM_CONFIG_REGISTRY'];
  }

  const worksMessage = 'We analyzed your package.json';

  try {
    // Valid authentication token
    await createNpmConfigForAuthentication(false);
    const { stdout: stdout1 } = await ng('update');
    if (!stdout1.includes(worksMessage)) {
      throw new Error(`Expected stdout to contain "${worksMessage}"`);
    }

    await createNpmConfigForAuthentication(true);
    const { stdout: stdout2 } = await ng('update');
    if (!stdout2.includes(worksMessage)) {
      throw new Error(`Expected stdout to contain "${worksMessage}"`);
    }

    // Invalid authentication token
    await createNpmConfigForAuthentication(false, true);
    await expectToFail(() => ng('update'));

    await createNpmConfigForAuthentication(true, true);
    await expectToFail(() => ng('update'));
  } finally {
    if (originalRegistryVariable) {
      process.env['NPM_CONFIG_REGISTRY'] = originalRegistryVariable;
    }
  }
}
