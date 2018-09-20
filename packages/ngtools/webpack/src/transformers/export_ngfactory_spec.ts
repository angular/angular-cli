/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { tags } from '@angular-devkit/core';  // tslint:disable-line:no-implicit-dependencies
import { transformTypescript } from './ast_helpers';
import { exportNgFactory } from './export_ngfactory';

describe('@ngtools/webpack transformers', () => {
  describe('export_ngfactory', () => {
    it('should export the ngfactory', () => {
      const input = tags.stripIndent`
        export { AppModule } from './app/app.module';
      `;
      const output = tags.stripIndent`
        export { AppModuleNgFactory } from "./app/app.module.ngfactory";
        export { AppModule } from './app/app.module';
      `;

      const transformer = exportNgFactory(
        () => true,
        () => ({ path: '/project/src/app/app.module', className: 'AppModule' }),
      );
      const result = transformTypescript(input, [transformer]);

      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
    });

    it('should export the ngfactory when there is a barrel file', () => {
      const input = tags.stripIndent`
        export { AppModule } from './app';
      `;
      const output = tags.stripIndent`
        export { AppModuleNgFactory } from "./app/app.module.ngfactory";
        export { AppModule } from './app';
      `;

      const transformer = exportNgFactory(
        () => true,
        () => ({ path: '/project/src/app/app.module', className: 'AppModule' }),
      );
      const result = transformTypescript(input, [transformer]);

      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
    });

    it('should not do anything if shouldTransform returns false', () => {
      const input = tags.stripIndent`
        export { AppModule } from './app/app.module';
      `;

      const transformer = exportNgFactory(
        () => false,
        () => ({ path: '/project/src/app/app.module', className: 'AppModule' }),
      );
      const result = transformTypescript(input, [transformer]);

      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${input}`);
    });
  });
});
