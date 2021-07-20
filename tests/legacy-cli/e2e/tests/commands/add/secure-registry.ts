import { expectFileNotToExist, expectFileToExist } from '../../../utils/fs';
import { git, ng } from '../../../utils/process';
import { createNpmConfigForAuthentication } from '../../../utils/registry';
import { expectToFail } from '../../../utils/utils';

export default async function () {
  // The environment variable has priority over the .npmrc
  let originalRegistryVariable;
  if (process.env['NPM_CONFIG_REGISTRY']) {
    originalRegistryVariable = process.env['NPM_CONFIG_REGISTRY'];
    delete process.env['NPM_CONFIG_REGISTRY'];
  }

  try {
    const command = ['add', '@angular/pwa', '--skip-confirmation'];
    await expectFileNotToExist('src/manifest.webmanifest');

    // Works with unscoped registry authentication details
    await createNpmConfigForAuthentication(false);
    await ng(...command);
    await expectFileToExist('src/manifest.webmanifest');
    await git('clean', '-dxf');

    // Works with scoped registry authentication details
    await expectFileNotToExist('src/manifest.webmanifest');

    await createNpmConfigForAuthentication(true);
    await ng(...command);
    await expectFileToExist('src/manifest.webmanifest');

    // Invalid authentication token
    await createNpmConfigForAuthentication(false, true);
    await expectToFail(() => ng(...command));

    await createNpmConfigForAuthentication(true, true);
    await expectToFail(() => ng(...command));
  } finally {
    if (originalRegistryVariable) {
      process.env['NPM_CONFIG_REGISTRY'] = originalRegistryVariable;
    }
  }
}
