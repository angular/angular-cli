import { expectFileNotToExist, expectFileToExist } from '../../../utils/fs';
import { installWorkspacePackages } from '../../../utils/packages';
import { git, ng } from '../../../utils/process';
import { createNpmConfigForAuthentication } from '../../../utils/registry';
import { expectToFail } from '../../../utils/utils';

export default async function () {
  const originalNpmConfigRegistry = process.env['NPM_CONFIG_REGISTRY'];
  try {
    // The environment variable has priority over the .npmrc
    delete process.env['NPM_CONFIG_REGISTRY'];
    const command = ['add', '@angular/pwa', '--skip-confirmation'];

    // Works with scoped registry authentication details
    await expectFileNotToExist('public/manifest.webmanifest');

    await createNpmConfigForAuthentication();
    await ng(...command);
    await expectFileToExist('public/manifest.webmanifest');
    await git('clean', '-dxf');

    // Invalid authentication token
    await createNpmConfigForAuthentication(true, true);
    await expectToFail(() => ng(...command));
  } finally {
    process.env['NPM_CONFIG_REGISTRY'] = originalNpmConfigRegistry;
    await git('clean', '-dxf');
    await installWorkspacePackages();
  }
}
