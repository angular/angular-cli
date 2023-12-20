/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { buildApplication } from '../../index';
import { APPLICATION_BUILDER_INFO, BASE_OPTIONS, describeBuilder } from '../setup';

describeBuilder(buildApplication, APPLICATION_BUILDER_INFO, (harness) => {
  describe('Option: "sourceMap"', () => {
    it('should not generate script sourcemap files by default', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        sourceMap: undefined,
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBe(true);

      harness.expectFile('dist/browser/main.js.map').toNotExist();
    });

    it('should not generate script sourcemap files when false', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        sourceMap: false,
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBe(true);

      harness.expectFile('dist/browser/main.js.map').toNotExist();
    });

    it('should not generate script sourcemap files when scripts suboption is false', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        sourceMap: { scripts: false },
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBe(true);

      harness.expectFile('dist/browser/main.js.map').toNotExist();
    });

    it('should generate script sourcemap files when true', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        sourceMap: true,
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBe(true);

      harness.expectFile('dist/browser/main.js.map').toExist();
    });

    it('should generate script sourcemap files when scripts suboption is true', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        sourceMap: { scripts: true },
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBe(true);

      harness.expectFile('dist/browser/main.js.map').toExist();
    });

    it('should not include third-party sourcemaps when true', async () => {
      await harness.writeFile('src/polyfills.js', `console.log('main');`);

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        sourceMap: true,
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBe(true);

      harness.expectFile('dist/browser/main.js.map').content.not.toContain('/core/index.ts');
      harness.expectFile('dist/browser/main.js.map').content.not.toContain('/common/index.ts');
    });

    it('should not include third-party sourcemaps when vendor suboption is false', async () => {
      await harness.writeFile('src/polyfills.js', `console.log('main');`);

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        sourceMap: { scripts: true, vendor: false },
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBe(true);

      harness.expectFile('dist/browser/main.js.map').content.not.toContain('/core/index.ts');
      harness.expectFile('dist/browser/main.js.map').content.not.toContain('/common/index.ts');
    });

    it('should include third-party sourcemaps when vendor suboption is true', async () => {
      await harness.writeFile('src/polyfills.js', `console.log('main');`);

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        sourceMap: { scripts: true, vendor: true },
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBe(true);

      harness.expectFile('dist/browser/main.js.map').content.toContain('/core/index.ts');
      harness.expectFile('dist/browser/main.js.map').content.toContain('/common/index.ts');
    });

    it('should add "x_google_ignoreList" extension to script sourcemap files when true', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        sourceMap: true,
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBe(true);

      harness.expectFile('dist/browser/main.js.map').content.toContain('"x_google_ignoreList"');
    });

    it('should generate component sourcemaps when sourcemaps when true', async () => {
      await harness.writeFile('src/app/app.component.css', `* { color: red}`);

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        sourceMap: true,
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBeTrue();

      harness
        .expectFile('dist/browser/main.js')
        .content.toContain('sourceMappingURL=app.component.css.map');
      harness.expectFile('dist/browser/app.component.css.map').toExist();
    });

    it('should not generate component sourcemaps when sourcemaps when false', async () => {
      await harness.writeFile('src/app/app.component.css', `* { color: red}`);

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        sourceMap: false,
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBeTrue();

      harness
        .expectFile('dist/browser/main.js')
        .content.not.toContain('sourceMappingURL=app.component.css.map');
      harness.expectFile('dist/browser/app.component.css.map').toNotExist();
    });
  });
});
