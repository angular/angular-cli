import { homedir } from 'os';
import * as path from 'path';
import { deleteFile, expectFileToExist } from '../../../utils/fs';
import { ng } from '../../../utils/process';
import { expectToFail } from '../../../utils/utils';


export default async function() {
  await expectToFail(() => ng(
    'config',
    '--global',
    'schematics.@schematics/angular.component.inlineStyle',
  ));

  await ng('config', '--global', 'schematics.@schematics/angular.component.inlineStyle', 'false');
  let output = await ng(
    'config',
    '--global',
    'schematics.@schematics/angular.component.inlineStyle',
  );
  if (!output.stdout.match(/false\n?/)) {
    throw new Error(`Expected "false", received "${JSON.stringify(output.stdout)}".`);
  }

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
  if (!output.stdout.match(/true\n?/)) {
    throw new Error(`Expected "true", received "${JSON.stringify(output.stdout)}".`);
  }

  await expectToFail(() => ng('config', '--global', 'cli.warnings.notreal', 'true'));

  await ng('config', '--global', 'cli.warnings.versionMismatch', 'false');
  await expectFileToExist(path.join(homedir(), '.angular-config.json'));
  await deleteFile(path.join(homedir(), '.angular-config.json'));
}
