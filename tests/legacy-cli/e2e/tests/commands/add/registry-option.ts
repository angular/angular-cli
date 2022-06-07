import { getGlobalVariable } from '../../../utils/env';
import { expectFileToExist } from '../../../utils/fs';
import { ng } from '../../../utils/process';
import { expectToFail } from '../../../utils/utils';

export default async function () {
  const testRegistry = getGlobalVariable('package-registry');

  // Set an invalid registry
  process.env['NPM_CONFIG_REGISTRY'] = 'http://127.0.0.1:9999';

  await expectToFail(() => ng('add', '@angular/pwa', '--skip-confirmation'));

  await ng('add', `--registry=${testRegistry}`, '@angular/pwa', '--skip-confirmation');
  await expectFileToExist('src/manifest.webmanifest');
}
