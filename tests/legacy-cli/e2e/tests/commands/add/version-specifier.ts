import assert from 'node:assert/strict';
import { appendFile } from 'node:fs/promises';
import { expectFileToMatch } from '../../../utils/fs';
import { getActivePackageManager, uninstallPackage } from '../../../utils/packages';
import { ng } from '../../../utils/process';
import { isPrereleaseCli } from '../../../utils/project';

export default async function () {
  // forcibly remove in case another test doesn't clean itself up.
  await uninstallPackage('@angular/localize');

  // If using npm, enable the legacy-peer-deps option to allow testing the output behavior of the
  // `ng add` command itself and not the behavior of npm which may otherwise fail depending
  // on the npm version in use and the version specifier supplied in each test.
  if (getActivePackageManager() === 'npm') {
    await appendFile('.npmrc', '\nlegacy-peer-deps=true\n');
  }

  const tag = isPrereleaseCli() ? '@next' : '';

  await ng('add', `@angular/localize${tag}`, '--skip-confirmation');
  await expectFileToMatch('package.json', /@angular\/localize/);

  const output1 = await ng('add', '@angular/localize', '--skip-confirmation');
  assert.match(
    output1.stdout,
    /Skipping installation: Package already installed/,
    'Installation was not skipped',
  );

  const output2 = await ng('add', '@angular/localize@latest', '--skip-confirmation');
  assert.doesNotMatch(
    output2.stdout,
    /Skipping installation: Package already installed/,
    'Installation should not have been skipped',
  );

  const output3 = await ng('add', '@angular/localize@19.1.0', '--skip-confirmation');
  assert.doesNotMatch(
    output3.stdout,
    /Skipping installation: Package already installed/,
    'Installation should not have been skipped',
  );

  const output4 = await ng('add', '@angular/localize@19', '--skip-confirmation');
  assert.match(
    output4.stdout,
    /Skipping installation: Package already installed/,
    'Installation was not skipped',
  );

  await uninstallPackage('@angular/localize');
}
