import * as ts from 'typescript';
import { oneLine, stripIndent } from 'common-tags';
import { transformTypescript } from './ast_helpers';
import { replaceBootstrap } from './replace_bootstrap';

describe('@ngtools/webpack transformers', () => {
  describe('replace_bootstrap', () => {
    it('should replace bootstrap', () => {
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
        import { enableProdMode } from '@angular/core';
        import { environment } from './environments/environment';

        import { AppModuleNgFactory } from "./app/app.module.ngfactory";
        import { platformBrowser } from "@angular/platform-browser";

        if (environment.production) {
          enableProdMode();
        }

        platformBrowser().bootstrapModuleFactory(AppModuleNgFactory);
      `;

      const transformOpsCb = (sourceFile: ts.SourceFile) =>
        replaceBootstrap(sourceFile, { path: '/app.module', className: 'AppModule' });
      const result = transformTypescript(input, transformOpsCb);

      expect(oneLine`${result}`).toEqual(oneLine`${output}`);
    });
  });
});
