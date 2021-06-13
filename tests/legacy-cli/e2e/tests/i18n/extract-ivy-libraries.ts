import { getGlobalVariable } from '../../utils/env';
import { expectFileToMatch, replaceInFile, writeFile } from '../../utils/fs';
import { installPackage, uninstallPackage } from '../../utils/packages';
import { ng } from '../../utils/process';
import { readNgVersion } from '../../utils/version';

export default async function() {
  // Setup a library
  await ng('generate', 'library', 'i18n-lib-test');
  await replaceInFile(
    'projects/i18n-lib-test/src/lib/i18n-lib-test.component.ts',
    '<p>',
    '<p i18n>',
  );

  // Build library
  await ng('build', 'i18n-lib-test', '--configuration=development');

  // Consume library in application
  await writeFile(
    'src/app/app.module.ts',
    `
    import { BrowserModule } from '@angular/platform-browser';
    import { NgModule } from '@angular/core';
    import { AppComponent } from './app.component';
    import { I18nLibTestModule } from 'i18n-lib-test';

    @NgModule({
      declarations: [
        AppComponent
      ],
      imports: [
        BrowserModule,
        I18nLibTestModule,
      ],
      providers: [],
      bootstrap: [AppComponent]
    })
    export class AppModule { }
    `,
  );

  await writeFile(
    'src/app/app.component.html',
    `
      <p i18n>Hello world</p>
      <lib-i18n-lib-test></lib-i18n-lib-test>
    `,
  );

  // Install correct version
  let localizeVersion = '@angular/localize@' + readNgVersion();
  if (getGlobalVariable('argv')['ng-snapshots']) {
    localizeVersion = require('../../ng-snapshot/package.json').dependencies['@angular/localize'];
  }
  await installPackage(localizeVersion);

  // Extract messages
  await ng('extract-i18n');
  await expectFileToMatch('messages.xlf', 'Hello world');
  await expectFileToMatch('messages.xlf', 'i18n-lib-test works!');
  await expectFileToMatch('messages.xlf', 'src/app/app.component.html');
  await expectFileToMatch(
    'messages.xlf',
    'projects/i18n-lib-test/src/lib/i18n-lib-test.component.ts',
  );

  await uninstallPackage('@angular/localize');
}
