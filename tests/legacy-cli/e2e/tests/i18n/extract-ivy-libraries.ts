import { getGlobalVariable } from '../../utils/env';
import { expectFileToMatch, replaceInFile, writeFile } from '../../utils/fs';
import { ng, npm } from '../../utils/process';
import { expectToFail } from '../../utils/utils';
import { readNgVersion } from '../../utils/version';

export default async function() {
  // Ivy only test
  if (getGlobalVariable('argv')['ve']) {
    return;
  }

  // Setup a library
  await ng('generate', 'library', 'i18n-lib-test');
  await replaceInFile(
    'projects/i18n-lib-test/src/lib/i18n-lib-test.component.ts',
    '<p>',
    '<p i18n>',
  );

  // Build library
  await ng('build', 'i18n-lib-test');

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
  await npm('install', 'https://817492-24195339-gh.circle-artifacts.com/0/angular/compiler-cli-pr39006-ca89d35106.tgz', 'https://817492-24195339-gh.circle-artifacts.com/0/angular/localize-pr39006-ca89d35106.tgz');

  // Extract messages
  await ng('xi18n', '--ivy');
  await expectFileToMatch('messages.xlf', 'Hello world');
  await expectFileToMatch('messages.xlf', 'i18n-lib-test works!');

  await npm('uninstall', '@angular/localize');

  await expectFileToMatch('messages.xlf', 'src/app/app.component.html');
  await expectFileToMatch(
    'messages.xlf',
    `projects/i18n-lib-test/src/lib/i18n-lib-test.component.ts`,
  );
}
