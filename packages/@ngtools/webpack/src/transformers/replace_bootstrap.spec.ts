// @ignoreDep typescript
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

      // tslint:disable:max-line-length
      const output = stripIndent`
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

      const transformOpsCb = (sourceFile: ts.SourceFile) =>
        replaceBootstrap(sourceFile, { path: '/app.module', className: 'AppModule' });
      const result = transformTypescript(input, transformOpsCb);

      expect(oneLine`${result}`).toEqual(oneLine`${output}`);
    });
  });
});
