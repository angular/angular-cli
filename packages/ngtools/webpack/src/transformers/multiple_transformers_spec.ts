/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { tags } from '@angular-devkit/core';  // tslint:disable-line:no-implicit-dependencies
import { createTypescriptContext, transformTypescript } from './ast_helpers';
import { exportLazyModuleMap } from './export_lazy_module_map';
import { exportNgFactory } from './export_ngfactory';
import { removeDecorators } from './remove_decorators';
import { replaceBootstrap } from './replace_bootstrap';


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
        import * as __lazy_0__ from "./app/lazy/lazy.module.ngfactory.ts";
        import * as __lazy_1__ from "./app/lazy2/lazy2.module.ngfactory.ts";

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

        export var LAZY_MODULE_MAP = { "./lazy/lazy.module#LazyModule": __lazy_0__.LazyModuleNgFactory, "./lazy2/lazy2.module#LazyModule2": __lazy_1__.LazyModule2NgFactory };
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
        exportLazyModuleMap(shouldTransform,
          () => ({
            './lazy/lazy.module.ngfactory#LazyModuleNgFactory':
            '/project/src/app/lazy/lazy.module.ngfactory.ts',
            './lazy2/lazy2.module.ngfactory#LazyModule2NgFactory':
            '/project/src/app/lazy2/lazy2.module.ngfactory.ts',
          })),
        removeDecorators(shouldTransform, getTypeChecker),
      ];

      const result = transformTypescript(undefined, transformers, program, compilerHost);

      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
    });
  });
});
