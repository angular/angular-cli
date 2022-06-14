import { join } from 'path';
import { getGlobalVariable } from '../../utils/env';
import { expectFileToMatch, writeFile } from '../../utils/fs';
import { installPackage, uninstallPackage } from '../../utils/packages';
import { ng } from '../../utils/process';
import { expectToFail } from '../../utils/utils';
import { readNgVersion } from '../../utils/version';

export default async function () {
  // Setup an i18n enabled component
  await ng('generate', 'component', 'i18n-test');
  await writeFile(join('src/app/i18n-test', 'i18n-test.component.html'), '<p i18n>Hello world</p>');

  // Should fail if `@angular/localize` is missing
  const { message: message1 } = await expectToFail(() => ng('extract-i18n'));
  if (!message1.includes(`i18n extraction requires the '@angular/localize' package.`)) {
    throw new Error('Expected localize package error message when missing');
  }

  // Install correct version
  let localizeVersion = '@angular/localize@' + readNgVersion();
  if (getGlobalVariable('argv')['ng-snapshots']) {
    localizeVersion = require('../../ng-snapshot/package.json').dependencies['@angular/localize'];
  }
  await installPackage(localizeVersion);

  // Should not show any warnings when extracting
  const { stderr: message5 } = await ng('extract-i18n');
  if (message5.includes('WARNING')) {
    throw new Error('Expected no warnings to be shown');
  }

  await expectFileToMatch('messages.xlf', 'Hello world');

  await uninstallPackage('@angular/localize');
}
