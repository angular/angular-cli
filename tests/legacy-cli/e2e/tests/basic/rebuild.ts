import {
  killAllProcesses,
  waitForAnyProcessOutputToMatch,
  execAndWaitForOutputToMatch,
  ng,
} from '../../utils/process';
import {writeFile, writeMultipleFiles} from '../../utils/fs';
import {wait} from '../../utils/utils';
import {request} from '../../utils/http';

const validBundleRegEx = /: Compiled successfully./;

export default function() {
  return execAndWaitForOutputToMatch('ng', ['serve'], validBundleRegEx)
    // Add a lazy module.
    .then(() => ng('generate', 'module', 'lazy', '--routing'))
    // Should trigger a rebuild with a new bundle.
    // We need to use Promise.all to ensure we are waiting for the rebuild just before we write
    // the file, otherwise rebuilds can be too fast and fail CI.
    .then(() => Promise.all([
      waitForAnyProcessOutputToMatch(validBundleRegEx, 20000),
      writeFile('src/app/app.module.ts', `
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
      `)
    ]))
    // Count the bundles.
    .then((results) => {
      const stdout = results[0].stdout;
      if (!/(lazy-module|0)\.js/g.test(stdout)) {
        throw new Error('Expected webpack to create a new chunk, but did not.');
      }
    })
    // Change multiple files and check that all of them are invalidated and recompiled.
    .then(() => Promise.all([
      waitForAnyProcessOutputToMatch(validBundleRegEx, 20000),
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
          import { enableProdMode } from '@angular/core';
          import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

          import { AppModule } from './app/app.module';
          import { environment } from './environments/environment';

          if (environment.production) {
            enableProdMode();
          }

          platformBrowserDynamic().bootstrapModule(AppModule);

          import * as m from './app/app.module';
          console.log(m.X);
          console.log('$$_E2E_GOLDEN_VALUE_3');
        `
      })
    ]))
    .then(() => wait(2000))
    .then(() => request('http://localhost:4200/main.js'))
    .then((body) => {
      if (!body.match(/\$\$_E2E_GOLDEN_VALUE_1/)) {
        throw new Error('Expected golden value 1.');
      }
      if (!body.match(/\$\$_E2E_GOLDEN_VALUE_2/)) {
        throw new Error('Expected golden value 2.');
      }
      if (!body.match(/\$\$_E2E_GOLDEN_VALUE_3/)) {
        throw new Error('Expected golden value 3.');
      }
    })
    .then(() => killAllProcesses(), (err: any) => {
      killAllProcesses();
      throw err;
    });
}
