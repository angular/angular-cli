import { getGlobalVariable } from '../../../utils/env';
import { expectFileToExist } from '../../../utils/fs';
import { execAndCaptureError, ng } from '../../../utils/process';
import { expectToFail } from '../../../utils/utils';

export default async function () {
  const testRegistry = getGlobalVariable('package-registry');

  // Validate that a non-URL registry string fails with a validation error
  const error = await execAndCaptureError('ng', [
    'add',
    '--registry=not-a-valid-url',
    '@angular/pwa',
    '--skip-confirmation',
  ]);
  if (!error.message.includes('Option --registry must be a valid URL.')) {
    throw new Error(
      `Expected registry validation error, but got different error: ${error.message}`,
    );
  }

  // Validate that an empty registry string fails with a validation error
  const errorEmpty = await execAndCaptureError('ng', [
    'add',
    '--registry=',
    '@angular/pwa',
    '--skip-confirmation',
  ]);
  if (!errorEmpty.message.includes('Option --registry must be a valid URL.')) {
    throw new Error(
      `Expected registry validation error for empty string, but got: ${errorEmpty.message}`,
    );
  }

  // Set an invalid registry
  process.env['NPM_CONFIG_REGISTRY'] = 'http://127.0.0.1:9999';

  await expectToFail(() => ng('add', '@angular/pwa', '--skip-confirmation'));

  await ng('add', `--registry=${testRegistry}`, '@angular/pwa', '--skip-confirmation');
  await expectFileToExist('public/manifest.webmanifest');
}
