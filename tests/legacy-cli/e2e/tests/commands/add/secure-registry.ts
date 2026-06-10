import { expectFileNotToExist, expectFileToExist } from '../../../utils/fs';
import { getActivePackageManager, installWorkspacePackages } from '../../../utils/packages';
import { git, ng } from '../../../utils/process';
import { createNpmConfigForAuthentication } from '../../../utils/registry';
import { expectToFail } from '../../../utils/utils';

export default async function () {
  // The environment variable has priority over the .npmrc
  delete process.env['NPM_CONFIG_REGISTRY'];
  delete process.env['YARN_REGISTRY'];
  delete process.env['NPM_CONFIG__AUTH'];
  delete process.env['NPM_CONFIG_ALWAYS_AUTH'];
  const isNpm = getActivePackageManager() === 'npm';

  const command = ['add', '@angular/pwa', '--skip-confirmation'];
  await expectFileNotToExist('public/manifest.webmanifest');

  // Works with scoped registry authentication details
  await expectFileNotToExist('public/manifest.webmanifest');

  await createNpmConfigForAuthentication(true);
  await ng(...command);
  await expectFileToExist('public/manifest.webmanifest');

  // Invalid authentication token
  await createNpmConfigForAuthentication(true, true);
  await expectToFail(() => ng(...command));

  await git('clean', '-dxf');
  await installWorkspacePackages();
}
