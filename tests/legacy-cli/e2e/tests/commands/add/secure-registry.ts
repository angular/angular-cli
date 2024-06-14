import { expectFileNotToExist, expectFileToExist } from '../../../utils/fs';
import { getActivePackageManager, installWorkspacePackages } from '../../../utils/packages';
import { git, ng } from '../../../utils/process';
import { createNpmConfigForAuthentication } from '../../../utils/registry';
import { expectToFail } from '../../../utils/utils';

export default async function () {
  // The environment variable has priority over the .npmrc
  delete process.env['NPM_CONFIG_REGISTRY'];
  const isNpm = getActivePackageManager() === 'npm';

  const command = ['add', '@angular/pwa', '--skip-confirmation'];
  await expectFileNotToExist('public/manifest.webmanifest');

  // Works with unscoped registry authentication details
  if (!isNpm) {
    // NPM no longer support unscoped.
    await createNpmConfigForAuthentication(false);
    await ng(...command);
    await expectFileToExist('public/manifest.webmanifest');
    await git('clean', '-dxf');
  }
  // Works with scoped registry authentication details
  await expectFileNotToExist('public/manifest.webmanifest');

  await createNpmConfigForAuthentication(true);
  await ng(...command);
  await expectFileToExist('public/manifest.webmanifest');

  // Invalid authentication token
  if (isNpm) {
    // NPM no longer support unscoped.
    await createNpmConfigForAuthentication(false, true);
    await expectToFail(() => ng(...command));
  }

  await createNpmConfigForAuthentication(true, true);
  await expectToFail(() => ng(...command));

  await git('clean', '-dxf');
  await installWorkspacePackages();
}
