import { waitForAnyProcessOutputToMatch, silentNg } from '../../utils/process';
import { writeFile, writeMultipleFiles } from '../../utils/fs';
import fetch from 'node-fetch';
import { ngServe } from '../../utils/project';

const validBundleRegEx = / Compiled successfully./;

export default async function () {
  const port = await ngServe();
  // Add a lazy module.
  await silentNg('generate', 'module', 'lazy', '--routing');

  // Should trigger a rebuild with a new bundle.
  // We need to use Promise.all to ensure we are waiting for the rebuild just before we write
  // the file, otherwise rebuilds can be too fast and fail CI.
  // Count the bundles.
  await Promise.all([
    waitForAnyProcessOutputToMatch(/lazy_module_ts\.js/),
    writeFile(
      'src/app/app.module.ts',
      `
        import { BrowserModule } from '@angular/platform-browser';
        import { NgModule } from '@angular/core';
        import { FormsModule } from '@angular/forms';
        import { HttpClientModule } from '@angular/common/http';

        import { AppComponent } from './app.component';
        import { RouterModule } from '@angular/router';

        @NgModule({
          declarations: [
            AppComponent
          ],
          imports: [
            BrowserModule,
            FormsModule,
            HttpClientModule,
            RouterModule.forRoot([
              { path: 'lazy', loadChildren: () => import('./lazy/lazy.module').then(m => m.LazyModule) }
            ])
          ],
          providers: [],
          bootstrap: [AppComponent]
        })
        export class AppModule { }
      `,
    ),
  ]);

  // Change multiple files and check that all of them are invalidated and recompiled.
  await Promise.all([
    waitForAnyProcessOutputToMatch(validBundleRegEx),
    writeMultipleFiles({
      'src/app/app.module.ts': `
        import { BrowserModule } from '@angular/platform-browser';
        import { NgModule } from '@angular/core';

        import { AppComponent } from './app.component';

        @NgModule({
          declarations: [
            AppComponent
          ],
          imports: [
            BrowserModule
          ],
          providers: [],
          bootstrap: [AppComponent]
        })
        export class AppModule { }

        console.log('$$_E2E_GOLDEN_VALUE_1');
        export let X = '$$_E2E_GOLDEN_VALUE_2';
        `,
      'src/main.ts': `
        import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
        import { AppModule } from './app/app.module';

        platformBrowserDynamic().bootstrapModule(AppModule);

        import * as m from './app/app.module';
        console.log(m.X);
        console.log('$$_E2E_GOLDEN_VALUE_3');
        `,
    }),
  ]);

  await Promise.all([
    waitForAnyProcessOutputToMatch(validBundleRegEx),
    writeMultipleFiles({
      'src/app/app.module.ts': `
        import { BrowserModule } from '@angular/platform-browser';
        import { NgModule } from '@angular/core';

        import { AppComponent } from './app.component';

        @NgModule({
          declarations: [
            AppComponent
          ],
          imports: [
            BrowserModule
          ],
          providers: [],
          bootstrap: [AppComponent]
        })
        export class AppModule { }

        console.log('$$_E2E_GOLDEN_VALUE_1');
        export let X = '$$_E2E_GOLDEN_VALUE_2';
        console.log('File changed with no import/export changes');
        `,
    }),
  ]);
  {
    const response = await fetch(`http://localhost:${port}/main.js`);
    const body = await response.text();
    if (!body.match(/\$\$_E2E_GOLDEN_VALUE_1/)) {
      throw new Error('Expected golden value 1.');
    }
    if (!body.match(/\$\$_E2E_GOLDEN_VALUE_2/)) {
      throw new Error('Expected golden value 2.');
    }
    if (!body.match(/\$\$_E2E_GOLDEN_VALUE_3/)) {
      throw new Error('Expected golden value 3.');
    }
  }

  await Promise.all([
    waitForAnyProcessOutputToMatch(validBundleRegEx),
    writeMultipleFiles({
      'src/app/app.component.html': '<h1>testingTESTING123</h1>',
    }),
  ]);

  {
    const response = await fetch(`http://localhost:${port}/main.js`);
    const body = await response.text();
    if (!body.match(/testingTESTING123/)) {
      throw new Error('Expected component HTML to update.');
    }
  }

  await Promise.all([
    waitForAnyProcessOutputToMatch(validBundleRegEx),
    writeMultipleFiles({
      'src/app/app.component.css': ':host { color: blue; }',
    }),
  ]);

  {
    const response = await fetch(`http://localhost:${port}/main.js`);
    const body = await response.text();
    if (!body.match(/color:\s?blue/)) {
      throw new Error('Expected component CSS to update.');
    }
  }
}
