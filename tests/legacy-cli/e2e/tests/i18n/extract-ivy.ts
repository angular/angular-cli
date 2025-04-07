import { join } from 'node:path';
import { getGlobalVariable } from '../../utils/env';
import { expectFileToMatch, writeFile } from '../../utils/fs';
import { uninstallPackage } from '../../utils/packages';
import { ng } from '../../utils/process';
import { expectToFail } from '../../utils/utils';
import { readNgVersion } from '../../utils/version';

export default async function () {
  // Setup an i18n enabled component
  await ng('generate', 'component', 'i18n-test');
  await writeFile(join('src/app/i18n-test', 'i18n-test.html'), '<p i18n>Hello world</p>');
  // Actually use the generated component to ensure it is present in the application output
  await writeFile(
    'src/app/app.ts',
    `
    import { Component } from '@angular/core';
    import { I18nTest } from './i18n-test/i18n-test';

    @Component({
      standalone: true,
      selector: 'app-root',
      imports: [I18nTest],
      template: '<app-i18n-test />'
    })
    export class App {}
  `,
  );

  // Ensure localize package is not present initially
  await uninstallPackage('@angular/localize');

  // Should fail if `@angular/localize` is missing
  const { message: message1 } = await expectToFail(() => ng('extract-i18n'));
  if (!message1.includes(`i18n extraction requires the '@angular/localize' package.`)) {
    throw new Error('Expected localize package error message when missing');
  }

  // Install correct version
  let localizeVersion = '@angular/localize@' + readNgVersion();
  if (getGlobalVariable('argv')['ng-snapshots']) {
    // The snapshots job won't work correctly because 'ng add' doesn't support github URLs
    // localizeVersion = require('../../ng-snapshot/package.json').dependencies['@angular/localize'];
    return;
  }
  await ng('add', localizeVersion, '--skip-confirmation');

  // Should not show any warnings when extracting
  const { stderr: message5 } = await ng('extract-i18n');
  if (message5.includes('WARNING')) {
    throw new Error('Expected no warnings to be shown. STDERR:\n' + message5);
  }

  await expectFileToMatch('messages.xlf', 'Hello world');

  await uninstallPackage('@angular/localize');
}
