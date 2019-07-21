/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { tags } from '@angular-devkit/core';  // tslint:disable-line:no-implicit-dependencies
import { createTypescriptContext, transformTypescript } from './ast_helpers';
import { replaceBootstrap } from './replace_bootstrap';

describe('@ngtools/webpack transformers', () => {
  describe('replace_bootstrap', () => {
    it('should replace bootstrap', () => {
      const input = tags.stripIndent`
        import { enableProdMode } from '@angular/core';
        import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

        import { AppModule } from './app/app.module';
        import { environment } from './environments/environment';

        if (environment.production) {
          enableProdMode();
        }

        platformBrowserDynamic().bootstrapModule(AppModule);
      `;

      const output = tags.stripIndent`
        import { enableProdMode } from '@angular/core';
        import { environment } from './environments/environment';

        import * as __NgCli_bootstrap_1 from "./app/app.module.ngfactory";
        import * as __NgCli_bootstrap_2 from "@angular/platform-browser";

        if (environment.production) {
          enableProdMode();
        }
        __NgCli_bootstrap_2.platformBrowser().bootstrapModuleFactory(__NgCli_bootstrap_1.AppModuleNgFactory);
      `;

      const { program, compilerHost } = createTypescriptContext(input);
      const transformer = replaceBootstrap(
        () => true,
        () => ({ path: '/project/src/app/app.module', className: 'AppModule' }),
        () => program.getTypeChecker(),
      );
      const result = transformTypescript(undefined, [transformer], program, compilerHost);

      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
    });

    it('should replace bootstrap without referencing ngFactory when useFactories is false', () => {
      const input = tags.stripIndent`
        import { enableProdMode } from '@angular/core';
        import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

        import { AppModule } from './app/app.module';
        import { environment } from './environments/environment';

        if (environment.production) {
          enableProdMode();
        }

        platformBrowserDynamic().bootstrapModule(AppModule);
      `;

      // tslint:disable:max-line-length
      const output = tags.stripIndent`
        import { enableProdMode } from '@angular/core';
        import { environment } from './environments/environment';

        import * as __NgCli_bootstrap_1 from "./app/app.module";
        import * as __NgCli_bootstrap_2 from "@angular/platform-browser";

        if (environment.production) {
          enableProdMode();
        }
        __NgCli_bootstrap_2.platformBrowser().bootstrapModule(__NgCli_bootstrap_1.AppModule);
      `;
      // tslint:enable:max-line-length

      const { program, compilerHost } = createTypescriptContext(input);
      const transformer = replaceBootstrap(
        () => true,
        () => ({ path: '/project/src/app/app.module', className: 'AppModule' }),
        () => program.getTypeChecker(),
        false,
      );
      const result = transformTypescript(undefined, [transformer], program, compilerHost);

      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
    });

    it('should replace bootstrap when barrel files are used', () => {
      const input = tags.stripIndent`
        import { enableProdMode } from '@angular/core';
        import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

        import { AppModule } from './app';
        import { environment } from './environments/environment';

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

        if (environment.production) {
          enableProdMode();
        }
        __NgCli_bootstrap_2.platformBrowser().bootstrapModuleFactory(__NgCli_bootstrap_1.AppModuleNgFactory);
      `;
      // tslint:enable:max-line-length

      const { program, compilerHost } = createTypescriptContext(input);
      const transformer = replaceBootstrap(
        () => true,
        () => ({ path: '/project/src/app/app.module', className: 'AppModule' }),
        () => program.getTypeChecker(),
      );
      const result = transformTypescript(undefined, [transformer], program, compilerHost);

      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
    });

    it('should not replace bootstrap when there is no entry module', () => {
      const input = tags.stripIndent`
        import { enableProdMode } from '@angular/core';
        import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

        import { AppModule } from './app/app.module';
        import { environment } from './environments/environment';

        if (environment.production) {
          enableProdMode();
        }

        platformBrowserDynamic().bootstrapModule(AppModule);
      `;

      const { program, compilerHost } = createTypescriptContext(input);
      const transformer = replaceBootstrap(
        () => true,
        () => null,
        () => program.getTypeChecker(),
      );
      const result = transformTypescript(undefined, [transformer], program, compilerHost);

      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${input}`);
    });
  });
});
