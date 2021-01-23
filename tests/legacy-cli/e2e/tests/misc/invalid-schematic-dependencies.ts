import { join } from 'path';
import { expectFileToMatch } from '../../utils/fs';
import { ng } from '../../utils/process';
import { installPackage, uninstallPackage } from '../../utils/packages';
import { isPrereleaseCli } from '../../utils/project';

export default async function () {
  const componentDir = join('src', 'app', 'test-component');

  // Install old and incompatible version
  // Must directly use npm registry since old versions are not hosted locally
  await installPackage('@schematics/angular@7', 'https://registry.npmjs.org')

  const tag = await isPrereleaseCli() ?  '@next' : '';
  await ng('add', `@angular/material${tag}`);
  await expectFileToMatch('package.json', /@angular\/material/);

  // Clean up existing cdk package
  // Not doing so can cause adding material to fail if an incompatible cdk is present
  await uninstallPackage('@angular/cdk');
}
