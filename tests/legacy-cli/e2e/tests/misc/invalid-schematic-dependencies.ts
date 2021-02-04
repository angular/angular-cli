import { expectFileToMatch } from '../../utils/fs';
import { ng, silentNpm } from '../../utils/process';
import { installPackage, uninstallPackage } from '../../utils/packages';
import { isPrereleaseCli } from '../../utils/project';

export default async function () {
  // Must publish old version to local registry to allow install. This is especially important
  // for release commits as npm will try to request tooling packages that are not on the npm registry yet
  const { stdout: stdoutPack1 } = await silentNpm(
    'pack',
    '@schematics/angular@7',
    '--registry=https://registry.npmjs.org',
  );
  await silentNpm('publish', stdoutPack1.trim(), '--registry=http://localhost:4873', '--tag=outdated');
  const { stdout: stdoutPack2 } = await silentNpm(
    'pack',
    '@angular-devkit/core@7',
    '--registry=https://registry.npmjs.org',
  );
  await silentNpm('publish', stdoutPack2.trim(), '--registry=http://localhost:4873', '--tag=outdated');
  const { stdout: stdoutPack3 } = await silentNpm(
    'pack',
    '@angular-devkit/schematics@7',
    '--registry=https://registry.npmjs.org',
  );
  await silentNpm('publish', stdoutPack3.trim(), '--registry=http://localhost:4873', '--tag=outdated');

  // Install outdated and incompatible version
  await installPackage('@schematics/angular@7');

  const tag = (await isPrereleaseCli()) ? '@next' : '';
  await ng('add', `@angular/material${tag}`);
  await expectFileToMatch('package.json', /@angular\/material/);

  // Clean up existing cdk package
  // Not doing so can cause adding material to fail if an incompatible cdk is present
  await uninstallPackage('@angular/cdk');
}
