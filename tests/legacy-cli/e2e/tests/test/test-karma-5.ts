import { ng } from '../../utils/process';
import { installPackage } from '../../utils/packages';

/**
 * Ensure karma 5.2 continues to function
 */
export default async function () {
  await installPackage('karma@5.2');

  await ng('test', '--watch=false');
}
