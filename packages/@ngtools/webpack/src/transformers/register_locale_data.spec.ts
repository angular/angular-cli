import * as ts from 'typescript';
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
        import __locale_fr__ from "@angular/common/locales/fr";
        import { registerLocaleData } from "@angular/common";
        registerLocaleData(__locale_fr__);

        import { enableProdMode } from '@angular/core';
        import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

        import { AppModule } from './app/app.module';
        import { environment } from './environments/environment';

        if (environment.production) {
            enableProdMode();
        }

        platformBrowserDynamic().bootstrapModule(AppModule);
      `;

      const transformOpsCb = (sourceFile: ts.SourceFile) =>
        registerLocaleData(sourceFile, { path: '/app.module', className: 'AppModule' }, 'fr');
      const result = transformTypescript(input, transformOpsCb);

      expect(oneLine`${result}`).toEqual(oneLine`${output}`);
    });
  });
});
