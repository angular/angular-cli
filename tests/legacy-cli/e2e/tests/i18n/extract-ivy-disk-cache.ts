import { join } from 'path';
import { getGlobalVariable } from '../../utils/env';
import { appendToFile, expectFileToMatch, rimraf, writeFile } from '../../utils/fs';
import { installPackage, uninstallPackage } from '../../utils/packages';
import { ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';
import { readNgVersion } from '../../utils/version';

export default async function () {
  // Enable disk cache
  updateJsonFile('angular.json', (config) => {
    config.cli ??= {};
    config.cli.cache = { environment: 'all' };
  });

  // Setup an i18n enabled component
  await ng('generate', 'component', 'i18n-test');
  await writeFile(join('src/app/i18n-test', 'i18n-test.component.html'), '<p i18n>Hello world</p>');
  // Actually use the generated component to ensure it is present in the application output
  await appendToFile('src/app/app.component.html', '<app-i18n-test>');

  // Install correct version
  let localizeVersion = '@angular/localize@' + readNgVersion();
  if (getGlobalVariable('argv')['ng-snapshots']) {
    localizeVersion = require('../../ng-snapshot/package.json').dependencies['@angular/localize'];
  }

  await installPackage(localizeVersion);

  for (let i = 0; i < 2; i++) {
    // Run the extraction twice and make sure the second time round works with cache.
    await rimraf('messages.xlf');
    await ng('extract-i18n');
    await expectFileToMatch('messages.xlf', 'Hello world');
  }

  await uninstallPackage('@angular/localize');
}
