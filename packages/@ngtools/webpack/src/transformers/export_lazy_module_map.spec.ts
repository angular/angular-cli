import * as ts from 'typescript';
import { oneLine, stripIndent } from 'common-tags';
import { transformTypescript } from './ast_helpers';
import { exportLazyModuleMap } from './export_lazy_module_map';

describe('export_lazy_module_map', () => {
  it('should create module map for JIT', () => {
    it('should replace resources', () => {
      const input = stripIndent`
        export { AppModule } from './app/app.module';
      `;
      // tslint:disable:max-line-length
      const output = stripIndent`
        import * as __lazy_0__ from "app/lazy/lazy.module.ts";
        import * as __lazy_1__ from "app/lazy2/lazy2.module.ts";
        export { AppModule } from './app/app.module';
        export var LAZY_MODULE_MAP = { "./lazy/lazy.module#LazyModule": __lazy_0__.LazyModule, "./lazy2/lazy2.module#LazyModule2": __lazy_1__.LazyModule2 };
      `;
      // tslint:enable:max-line-length

      const transformOpsCb = (sourceFile: ts.SourceFile) => exportLazyModuleMap(sourceFile, {
        './lazy/lazy.module#LazyModule': '/project/src/app/lazy/lazy.module.ts',
        './lazy2/lazy2.module#LazyModule2': '/project/src/app/lazy2/lazy2.module.ts',
      });
      const result = transformTypescript(input, transformOpsCb);

      expect(oneLine`${result}`).toEqual(oneLine`${output}`);
    });
  });

  it('should create module map for AOT', () => {
    const input = stripIndent`
      export { AppModule } from './app/app.module';
    `;
    // tslint:disable:max-line-length
    const output = stripIndent`
      import * as __lazy_0__ from "app/lazy/lazy.module.ts";
      import * as __lazy_1__ from "app/lazy2/lazy2.module.ts";
      export { AppModule } from './app/app.module';
      export var LAZY_MODULE_MAP = { "./lazy/lazy.module#LazyModule": __lazy_0__.LazyModule, "./lazy2/lazy2.module#LazyModule2": __lazy_1__.LazyModule2 };
    `;
    // tslint:enable:max-line-length

    const transformOpsCb = (sourceFile: ts.SourceFile) => exportLazyModuleMap(sourceFile, {
      './lazy/lazy.module.ngfactory#LazyModuleNgFactory':
        '/project/src/app/lazy/lazy.module.ngfactory.ts',
      './lazy2/lazy2.module.ngfactory#LazyModule2NgFactory':
        '/project/src/app/lazy2/lazy2.module.ngfactory.ts',
    });
    const result = transformTypescript(input, transformOpsCb);

    expect(oneLine`${result}`).toEqual(oneLine`${output}`);
  });
});
