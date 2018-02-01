import { oneLine, stripIndent } from 'common-tags';
import { transformTypescript } from './ast_helpers';
import { registerLocaleData } from './register_locale_data';

describe('@ngtools/webpack transformers', () => {
  describe('register_locale_data', () => {
    it('should add locale imports', () => {
      const input = stripIndent`
        import { enableProdMode } from '@angular/core';
        import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

        import { AppModule } from './app/app.module';
        import { environment } from './environments/environment';

        if (environment.production) {
          enableProdMode();
        }

        platformBrowserDynamic().bootstrapModule(AppModule);
      `;
      const output = stripIndent`
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
        'fr'
      );
      const result = transformTypescript(input, [transformer]);

      expect(oneLine`${result}`).toEqual(oneLine`${output}`);
    });

    it('should not add locale imports when there is no entry module', () => {
      const input = stripIndent`
        import { enableProdMode } from '@angular/core';
        import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

        import { AppModule } from './app/app.module';
        import { environment } from './environments/environment';

        if (environment.production) {
          enableProdMode();
        }

        platformBrowserDynamic().bootstrapModule(AppModule);
      `;

      const transformer = registerLocaleData(() => true, () => undefined, 'fr');
      const result = transformTypescript(input, [transformer]);

      expect(oneLine`${result}`).toEqual(oneLine`${input}`);
    });
  });
});
