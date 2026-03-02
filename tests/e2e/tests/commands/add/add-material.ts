import { assertIsError } from '../../../utils/utils';
import { readFile, rimraf } from '../../../utils/fs';
import { getActivePackageManager, uninstallPackage } from '../../../utils/packages';
import { ng } from '../../../utils/process';
import { isPrereleaseCli } from '../../../utils/project';
import { appendFile } from 'node:fs/promises';
import assert from 'node:assert';

export default async function () {
  // forcibly remove in case another test doesn't clean itself up
  await rimraf('node_modules/@angular/material');

  const isPrerelease = await isPrereleaseCli();
  const tag = isPrerelease ? '@next' : '';
  if (getActivePackageManager() === 'npm') {
    await appendFile('.npmrc', '\nlegacy-peer-deps=true');
  }

  try {
    await ng('add', `@angular/material${tag}`, '--unknown', '--skip-confirmation');
  } catch (error) {
    assertIsError(error);
    if (!(error as Error).message.includes(`Unknown option: '--unknown'`)) {
      throw error;
    }
  }

  await ng(
    'add',
    `@angular/material${tag}`,
    '--theme',
    'azure-blue',
    '--verbose',
    '--skip-confirmation',
  );

  const { dependencies } = JSON.parse(await readFile('package.json'));
  assert.ok(
    dependencies['@angular/material'],
    '`@angular/material` was not found added to dependencies',
  );

  // Clean up existing cdk package
  // Not doing so can cause adding material to fail if an incompatible cdk is present
  await uninstallPackage('@angular/cdk');
}
