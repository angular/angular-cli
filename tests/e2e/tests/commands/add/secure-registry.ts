import { expectFileNotToExist, expectFileToExist, rimraf } from '../../../utils/fs';
import { getActivePackageManager, installWorkspacePackages } from '../../../utils/packages';
import { git, ng } from '../../../utils/process';
import { createNpmConfigForAuthentication } from '../../../utils/registry';
import { expectToFail } from '../../../utils/utils';

export default async function () {
  const originalNpmConfigRegistry = process.env['NPM_CONFIG_REGISTRY'];
  try {
    // The environment variable has priority over the .npmrc
    delete process.env['NPM_CONFIG_REGISTRY'];
    const packageManager = getActivePackageManager();
    const supportsUnscopedAuth = packageManager === 'yarn';
    const command = ['add', '@angular/pwa', '--skip-confirmation'];

    // Works with unscoped registry authentication details
    if (supportsUnscopedAuth) {
      // Some package managers such as Bun and NPM do not support unscoped auth.
      await createNpmConfigForAuthentication(false);

      await expectFileNotToExist('public/manifest.webmanifest');

      await ng(...command);
      await expectFileToExist('public/manifest.webmanifest');
      await git('clean', '-dxf');
    }

    // Works with scoped registry authentication details
    await expectFileNotToExist('public/manifest.webmanifest');

    await createNpmConfigForAuthentication(true);
    await ng(...command);
    await expectFileToExist('public/manifest.webmanifest');
    await git('clean', '-dxf');

    // Invalid authentication token
    if (supportsUnscopedAuth) {
      // Some package managers such as Bun and NPM do not support unscoped auth.
      await createNpmConfigForAuthentication(false, true);
      await expectToFail(() => ng(...command));
    }

    await createNpmConfigForAuthentication(true, true);
    await expectToFail(() => ng(...command));
  } finally {
    process.env['NPM_CONFIG_REGISTRY'] = originalNpmConfigRegistry;
    await git('clean', '-dxf');
    await installWorkspacePackages();
  }
}
