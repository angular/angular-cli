/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { tags } from '@angular-devkit/core';  // tslint:disable-line:no-implicit-dependencies
import { exportNgFactory } from './export_ngfactory';
import { removeDecorators } from './remove_decorators';
import { replaceBootstrap } from './replace_bootstrap';
import { createTypescriptContext, transformTypescript } from './spec_helpers';


describe('@ngtools/webpack transformers', () => {
  describe('multiple_transformers', () => {
    it('should apply multiple transformers on the same file', () => {
      const input = tags.stripIndent`
        import { enableProdMode } from '@angular/core';
        import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
        import { Component } from '@angular/core';

        import { AppModule } from './app/app.module';
        import { environment } from './environments/environment';

        @Component({
          selector: 'app-root',
          templateUrl: './app.component.html',
          styleUrls: ['./app.component.css']
        })
        class AppComponent {
          title = 'app';
        }

        if (environment.production) {
          enableProdMode();
        }

        platformBrowserDynamic().bootstrapModule(AppModule);
      `;

      // tslint:disable:max-line-length
      const output = tags.stripIndent`
        import { enableProdMode } from '@angular/core';
        import { environment } from './environments/environment';

        import * as __NgCli_bootstrap_1 from "./app/app.module.ngfactory";
        import * as __NgCli_bootstrap_2 from "@angular/platform-browser";

        class AppComponent {
          constructor() { this.title = 'app'; }
        }

        if (environment.production) {
          enableProdMode();
        }
        __NgCli_bootstrap_2.platformBrowser().bootstrapModuleFactory(__NgCli_bootstrap_1.AppModuleNgFactory);
      `;
      // tslint:enable:max-line-length

      const { program, compilerHost } = createTypescriptContext(input);

      const shouldTransform = () => true;
      const getEntryModule = () =>
        ({ path: '/project/src/app/app.module', className: 'AppModule' });
      const getTypeChecker = () => program.getTypeChecker();


      const transformers = [
        replaceBootstrap(shouldTransform, getEntryModule, getTypeChecker),
        exportNgFactory(shouldTransform, getEntryModule),
        removeDecorators(shouldTransform, getTypeChecker),
      ];

      const result = transformTypescript(undefined, transformers, program, compilerHost);

      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
    });
  });
});
