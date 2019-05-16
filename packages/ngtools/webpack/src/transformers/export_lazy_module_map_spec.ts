/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { tags } from '@angular-devkit/core';  // tslint:disable-line:no-implicit-dependencies
import { transformTypescript } from './ast_helpers';
import { exportLazyModuleMap } from './export_lazy_module_map';

describe('@ngtools/webpack transformers', () => {
  describe('export_lazy_module_map', () => {
    it('should create module map for JIT', () => {
      const input = tags.stripIndent`
        export { AppModule } from './app/app.module';
      `;
      // tslint:disable:max-line-length
      const output = tags.stripIndent`
        import * as __lazy_0__ from "./app/lazy/lazy.module.ts";
        import * as __lazy_1__ from "./app/lazy2/lazy2.module.ts";
        export { AppModule } from './app/app.module';
        export var LAZY_MODULE_MAP = { "./lazy/lazy.module#LazyModule": __lazy_0__.LazyModule, "./lazy2/lazy2.module#LazyModule2": __lazy_1__.LazyModule2 };
      `;
      // tslint:enable:max-line-length

      const transformer = exportLazyModuleMap(
        () => true,
        () => ({
          './lazy/lazy.module#LazyModule': '/project/src/app/lazy/lazy.module.ts',
          './lazy2/lazy2.module#LazyModule2': '/project/src/app/lazy2/lazy2.module.ts',
        }),
      );
      const result = transformTypescript(input, [transformer]);

      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
    });

    it('should create module map for AOT', () => {
      const input = tags.stripIndent`
      export { AppModule } from './app/app.module';
    `;
      // tslint:disable:max-line-length
      const expected = tags.stripIndent`
      import * as __lazy_0__ from "./app/lazy/lazy.module.ngfactory.ts";
      import * as __lazy_1__ from "./app/lazy2/lazy2.module.ngfactory.ts";
      export { AppModule } from './app/app.module';
      export var LAZY_MODULE_MAP = { "./lazy/lazy.module#LazyModule": __lazy_0__.LazyModuleNgFactory, "./lazy2/lazy2.module#LazyModule2": __lazy_1__.LazyModule2NgFactory };
    `;
      // tslint:enable:max-line-length

      const transformer = exportLazyModuleMap(
        () => true,
        () => ({
          './lazy/lazy.module.ngfactory#LazyModuleNgFactory':
          '/project/src/app/lazy/lazy.module.ngfactory.ts',
          './lazy2/lazy2.module.ngfactory#LazyModule2NgFactory':
          '/project/src/app/lazy2/lazy2.module.ngfactory.ts',
        }),
      );
      const result = transformTypescript(input, [transformer]);

      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${expected}`);
    });
  });

  it('should not do anything if shouldTransform returns false', () => {
    const input = tags.stripIndent`
        export { AppModule } from './app/app.module';
      `;

    const transformer = exportLazyModuleMap(
      () => false,
      () => ({
        './lazy/lazy.module#LazyModule': '/project/src/app/lazy/lazy.module.ts',
        './lazy2/lazy2.module#LazyModule2': '/project/src/app/lazy2/lazy2.module.ts',
      }),
    );
    const result = transformTypescript(input, [transformer]);

    expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${input}`);
  });
});
