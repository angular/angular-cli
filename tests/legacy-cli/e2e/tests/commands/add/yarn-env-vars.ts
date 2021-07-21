import { expectFileNotToExist, expectFileToExist } from '../../../utils/fs';
import { getActivePackageManager } from '../../../utils/packages';
import { git, ng } from '../../../utils/process';
import {
  createNpmConfigForAuthentication,
  setNpmEnvVarsForAuthentication,
} from '../../../utils/registry';

export default async function () {
  // Yarn specific test that tests YARN_ env variables.
  // https://classic.yarnpkg.com/en/docs/envvars/
  if (getActivePackageManager() !== 'yarn') {
    return;
  }
  const command = ['add', '@angular/pwa', '--skip-confirmation'];

  // Environment variables only
  await expectFileNotToExist('src/manifest.webmanifest');
  setNpmEnvVarsForAuthentication(false, true);
  await ng(...command);
  await expectFileToExist('src/manifest.webmanifest');
  await git('clean', '-dxf');

  // Mix of config file and env vars works
  await expectFileNotToExist('src/manifest.webmanifest');
  await createNpmConfigForAuthentication(false, true);
  await ng(...command);
  await expectFileToExist('src/manifest.webmanifest');
}
