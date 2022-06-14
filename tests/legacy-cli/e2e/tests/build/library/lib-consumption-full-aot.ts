import { ng } from '../../../utils/process';
import { libraryConsumptionSetup } from './setup';

export default async function () {
  await libraryConsumptionSetup();

  // Build library in full mode (development)
  await ng('build', 'my-lib', '--configuration=development');

  // Check that the e2e succeeds prod and non prod mode
  await ng('e2e', '--configuration=production');
  await ng('e2e', '--configuration=development');
}
