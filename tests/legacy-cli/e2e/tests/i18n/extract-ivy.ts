import { join } from 'path';
import { getGlobalVariable } from '../../utils/env';
import { writeFile } from '../../utils/fs';
import { ng, npm } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';
import { expectToFail } from '../../utils/utils';
import { readNgVersion } from '../../utils/version';

export default async function() {
  // Ivy only test
  if (getGlobalVariable('argv')['ve']) {
    return;
  }

  // Setup an i18n enabled component
  await ng('generate', 'component', 'i18n-test');
  await writeFile(
    join('src/app/i18n-test', 'i18n-test.component.html'),
    '<p i18n>Hello world</p>',
  );

  // Should fail with --ivy flag if `@angular/localize` is missing
  const { message: message1 } = await expectToFail(() => ng('xi18n', '--ivy'));
  if (!message1.includes(`Ivy extraction requires the '@angular/localize' package version 10.1.0 or higher.`)) {
    throw new Error('Expected localize package error message when missing');
  }

  // Should fail with --ivy flag if `@angular/localize` is wrong version
  await npm('install', '@angular/localize@9');
  const { message: message2 } = await expectToFail(() => ng('xi18n', '--ivy'));
  if (!message2.includes(`Ivy extraction requires the '@angular/localize' package version 10.1.0 or higher.`)) {
    throw new Error('Expected localize package error message when wrong version');
  }

  // Install correct version
  let localizeVersion = '@angular/localize@' + readNgVersion();
  if (getGlobalVariable('argv')['ng-snapshots']) {
    localizeVersion = require('../../ng-snapshot/package.json').dependencies['@angular/localize'];
  }
  await npm('install', `${localizeVersion}`);

  // Should show ivy enabled application warning without --ivy flag
  const { stderr: message3 } = await ng('xi18n');
  if (!message3.includes(`Ivy extraction not enabled but application is Ivy enabled.`)) {
    throw new Error('Expected ivy enabled application warning');
  }

  // Should not show any warnings when extracting
  const { stderr: message5 } = await ng('xi18n', '--ivy');
  if (message5.includes('WARNING')) {
    throw new Error('Expected no warnings to be shown');
  }

  // Disable Ivy
  await updateJsonFile('tsconfig.json', config => {
    const { angularCompilerOptions = {} } = config;
    angularCompilerOptions.enableIvy = false;
    config.angularCompilerOptions = angularCompilerOptions;
  });

  // Should show ivy disabled application warning with --ivy flag and enableIvy false
  const { message: message4 } = await expectToFail(() => ng('xi18n', '--ivy'));
  if (!message4.includes(`Ivy extraction enabled but application is not Ivy enabled.`)) {
    throw new Error('Expected ivy disabled application warning');
  }

  await npm('uninstall', '@angular/localize');
}
