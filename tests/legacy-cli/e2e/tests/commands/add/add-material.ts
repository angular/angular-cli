import { expectFileToMatch, rimraf } from '../../../utils/fs';
import { uninstallPackage } from '../../../utils/packages';
import { ng } from '../../../utils/process';
import { isPrereleaseCli } from '../../../utils/project';


export default async function () {
  // forcibly remove in case another test doesn't clean itself up
  await rimraf('node_modules/@angular/material');

  const tag = await isPrereleaseCli() ?  '@next' : '';

  try {
    await ng('add', `@angular/material${tag}`, '--unknown', '--skip-confirmation');
  } catch (error) {
    if (!(error.message && error.message.includes(`Unknown option: '--unknown'`))) {
      throw error;
    }
  }

  await ng('add',  `@angular/material${tag}`, '--theme', 'custom', '--verbose', '--skip-confirmation');
  await expectFileToMatch('package.json', /@angular\/material/);

  // Clean up existing cdk package
  // Not doing so can cause adding material to fail if an incompatible cdk is present
  await uninstallPackage('@angular/cdk');
}
