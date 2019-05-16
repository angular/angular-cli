/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { tags } from '@angular-devkit/core';  // tslint:disable-line:no-implicit-dependencies
import { transformTypescript } from './ast_helpers';
import { registerLocaleData } from './register_locale_data';

describe('@ngtools/webpack transformers', () => {
  describe('register_locale_data', () => {
    it('should add locale imports', () => {
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
        import * as __NgCli_locale_1 from "@angular/common/locales/fr";
        import * as __NgCli_locale_2 from "@angular/common";
        __NgCli_locale_2.registerLocaleData(__NgCli_locale_1.default);

        import { enableProdMode } from '@angular/core';
        import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

        import { AppModule } from './app/app.module';
        import { environment } from './environments/environment';

        if (environment.production) {
            enableProdMode();
        }

        platformBrowserDynamic().bootstrapModule(AppModule);
      `;

      const transformer = registerLocaleData(
        () => true,
        () => ({ path: '/project/src/app/app.module', className: 'AppModule' }),
        'fr',
      );
      const result = transformTypescript(input, [transformer]);

      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
    });

    it('should not add locale imports when there is no entry module', () => {
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

      const transformer = registerLocaleData(() => true, () => null, 'fr');
      const result = transformTypescript(input, [transformer]);

      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${input}`);
    });
  });
});
