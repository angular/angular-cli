import { expectFileToMatch } from '../../../utils/fs';
import { ng } from '../../../utils/process';
import { libraryConsumptionSetup } from './setup';

export default async function () {
  await libraryConsumptionSetup();

  // Build library in full mode (development)
  await ng('build', 'my-lib', '--configuration=development');

  // Validate that sourcemaps for the library exists.
  await ng('build', '--configuration=development');
  await expectFileToMatch('dist/test-project/main.js.map', 'projects/my-lib/src/public-api.ts');
}
