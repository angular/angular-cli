import { oneLine, stripIndent } from 'common-tags';
import { transformTypescript } from './ast_helpers';
import { replaceBootstrap } from './replace_bootstrap';
import { exportNgFactory } from './export_ngfactory';
import { exportLazyModuleMap } from './export_lazy_module_map';

describe('@ngtools/webpack transformers', () => {
  describe('multiple_transformers', () => {
    it('should apply multiple transformers on the same file', () => {
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
        import * as __lazy_0__ from "app/lazy/lazy.module.ngfactory.ts";
        import * as __lazy_1__ from "app/lazy2/lazy2.module.ngfactory.ts";

        import { enableProdMode } from '@angular/core';
        import { environment } from './environments/environment';

        import * as __NgCli_bootstrap_1 from "./app/app.module.ngfactory";
        import * as __NgCli_bootstrap_2 from "@angular/platform-browser";
        if (environment.production) {
          enableProdMode();
        }
        __NgCli_bootstrap_2.platformBrowser().bootstrapModuleFactory(__NgCli_bootstrap_1.AppModuleNgFactory);

        export var LAZY_MODULE_MAP = { "./lazy/lazy.module#LazyModule": __lazy_0__.LazyModuleNgFactory, "./lazy2/lazy2.module#LazyModule2": __lazy_1__.LazyModule2NgFactory };
      `;
      // tslint:enable:max-line-length

      const shouldTransform = () => true;
      const getEntryModule = () =>
        ({ path: '/project/src/app/app.module', className: 'AppModule' });

      const transformers = [
        replaceBootstrap(shouldTransform, getEntryModule),
        exportNgFactory(shouldTransform, getEntryModule),
        exportLazyModuleMap(shouldTransform,
          () => ({
            './lazy/lazy.module.ngfactory#LazyModuleNgFactory':
            '/project/src/app/lazy/lazy.module.ngfactory.ts',
            './lazy2/lazy2.module.ngfactory#LazyModule2NgFactory':
            '/project/src/app/lazy2/lazy2.module.ngfactory.ts',
          })),
      ];

      const result = transformTypescript(input, transformers);

      expect(oneLine`${result}`).toEqual(oneLine`${output}`);
    });
  });
});
