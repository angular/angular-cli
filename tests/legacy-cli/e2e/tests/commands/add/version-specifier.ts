import { appendFile } from 'node:fs/promises';
import { expectFileToMatch, rimraf } from '../../../utils/fs';
import { getActivePackageManager, uninstallPackage } from '../../../utils/packages';
import { ng } from '../../../utils/process';
import { isPrereleaseCli } from '../../../utils/project';

export default async function () {
  // forcibly remove in case another test doesn't clean itself up.
  await rimraf('node_modules/@angular/localize');

  // If using npm, enable the force option to allow testing the output behavior of the
  // `ng add` command itself and not the behavior of npm which may otherwise fail depending
  // on the npm version in use and the version specifier supplied in each test.
  if (getActivePackageManager() === 'npm') {
    await appendFile('.npmrc', '\nforce=true\n');
  }

  const tag = (await isPrereleaseCli()) ? '@next' : '';

  await ng('add', `@angular/localize${tag}`, '--skip-confirmation');
  await expectFileToMatch('package.json', /@angular\/localize/);

  const output1 = await ng('add', '@angular/localize', '--skip-confirmation');
  if (!output1.stdout.includes('Skipping installation: Package already installed')) {
    throw new Error('Installation was not skipped');
  }

  const output2 = await ng('add', '@angular/localize@latest', '--skip-confirmation');
  if (output2.stdout.includes('Skipping installation: Package already installed')) {
    throw new Error('Installation should not have been skipped');
  }

  // v12.2.0 has a package.json engine field that supports Node.js v16+
  const output3 = await ng('add', '@angular/localize@12.2.0', '--skip-confirmation');
  if (output3.stdout.includes('Skipping installation: Package already installed')) {
    throw new Error('Installation should not have been skipped');
  }

  const output4 = await ng('add', '@angular/localize@12', '--skip-confirmation');
  if (!output4.stdout.includes('Skipping installation: Package already installed')) {
    throw new Error('Installation was not skipped');
  }

  await uninstallPackage('@angular/localize');
}
