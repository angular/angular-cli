import { expectFileNotToExist, expectFileToExist } from '../../../utils/fs';
import { git, ng } from '../../../utils/process';
import {
  createNpmConfigForAuthentication,
  setNpmEnvVarsForAuthentication,
} from '../../../utils/registry';

export default async function () {
  // Yarn also supports NPM_CONFIG env variables.
  // https://classic.yarnpkg.com/en/docs/envvars/

  const command = ['add', '@angular/pwa', '--skip-confirmation'];

  // Environment variables only
  await expectFileNotToExist('src/manifest.webmanifest');
  setNpmEnvVarsForAuthentication();
  await ng(...command);
  await expectFileToExist('src/manifest.webmanifest');
  await git('clean', '-dxf');

  // Mix of config file and env vars works
  await expectFileNotToExist('src/manifest.webmanifest');
  await createNpmConfigForAuthentication(false, true);
  await ng(...command);
  await expectFileToExist('src/manifest.webmanifest');
}
