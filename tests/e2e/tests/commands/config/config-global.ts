import assert from 'node:assert/strict';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { deleteFile, expectFileToExist } from '../../../utils/fs';
import { ng } from '../../../utils/process';
import { expectToFail } from '../../../utils/utils';

export default async function () {
  const globalConfigPath = join(homedir(), '.angular-config.json');

  try {
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

    const cwd = process.cwd();
    process.chdir('/');
    try {
      await ng(
        'config',
        '--global',
        'schematics.@schematics/angular.component.inlineStyle',
        'true',
      );
    } finally {
      process.chdir(cwd);
    }

    output = await ng('config', '--global', 'schematics.@schematics/angular.component.inlineStyle');
    assert.match(output.stdout, /true\n?/);

    await expectToFail(() => ng('config', '--global', 'cli.warnings.notreal', 'true'));

    await ng('config', '--global', 'cli.warnings.versionMismatch', 'false');
    await expectFileToExist(globalConfigPath);
  } finally {
    await deleteFile(globalConfigPath).catch(() => {});
  }
}
