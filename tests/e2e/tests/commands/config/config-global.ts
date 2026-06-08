import assert from 'node:assert/strict';
import { homedir } from 'node:os';
import * as path from 'node:path';
import { deleteFile, expectFileToExist } from '../../../utils/fs';
import { ng } from '../../../utils/process';
import { expectToFail } from '../../../utils/utils';

export default async function () {
  await expectToFail(() =>
    ng('config', '--global', 'schematics.@schematics/angular.component.inlineStyle'),
  );

  await ng('config', '--global', 'schematics.@schematics/angular.component.inlineStyle', 'false');
  let output = await ng(
    'config',
    '--global',
    'schematics.@schematics/angular.component.inlineStyle',
  );
  assert.match(output.stdout, /false\n?/);

  // This test requires schema querying capabilities
  // .then(() => expectToFail(() => {
  //   return ng('config', '--global', 'schematics.@schematics/angular.component.inlineStyle', 'INVALID_BOOLEAN');
  // }))

  const cwd = process.cwd();
  process.chdir('/');
  try {
    await ng('config', '--global', 'schematics.@schematics/angular.component.inlineStyle', 'true');
  } finally {
    process.chdir(cwd);
  }

  output = await ng('config', '--global', 'schematics.@schematics/angular.component.inlineStyle');
  assert.match(output.stdout, /true\n?/);

  await expectToFail(() => ng('config', '--global', 'cli.warnings.notreal', 'true'));

  await ng('config', '--global', 'cli.warnings.versionMismatch', 'false');
  await expectFileToExist(path.join(homedir(), '.angular-config.json'));
  await deleteFile(path.join(homedir(), '.angular-config.json'));
}
