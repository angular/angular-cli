/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { execute } from '../../index';
import { BASE_OPTIONS, SERVER_BUILDER_INFO, describeBuilder } from '../setup';

describeBuilder(execute, SERVER_BUILDER_INFO, (harness) => {
  describe('Option: "sourceMap"', () => {
    const INLINE_SOURCEMAP_MARKER =
      '/*# sourceMappingURL=data:application/json;charset=utf-8;base64,';

    beforeEach(async () => {
      await harness.writeFiles({
        'src/app/app.component.css': `p { color: red; }`,
      });
    });

    it(`should not generate sourceMaps when "sourceMap" option is unset`, async () => {
      harness.useTarget('server', {
        ...BASE_OPTIONS,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBe(true);
      harness.expectFile('dist/main.js.map').toNotExist();
    });

    it(`should generate sourceMaps when "sourceMap" option is true`, async () => {
      harness.useTarget('server', {
        ...BASE_OPTIONS,
        sourceMap: true,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBe(true);
      harness.expectFile('dist/main.js.map').toExist();
    });

    it(`should not generate sourceMaps when "sourceMap" option is false`, async () => {
      harness.useTarget('server', {
        ...BASE_OPTIONS,
        sourceMap: false,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBe(true);
      harness.expectFile('dist/main.js.map').toNotExist();
    });

    it(`should not generate components sourceMaps when "styles" option is false`, async () => {
      harness.useTarget('server', {
        ...BASE_OPTIONS,
        // Components sourcemaps are only present when optimization is false.
        optimization: false,
        sourceMap: {
          styles: false,
          scripts: true,
        },
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBe(true);
      harness.expectFile('dist/main.js.map').toExist();
      harness.expectFile('dist/main.js').content.toContain('sourceMappingURL=main.js.map');
      console.log(await harness.readFile('dist/main.js'));
      harness.expectFile('dist/main.js').content.not.toContain(INLINE_SOURCEMAP_MARKER);
    });

    it(`should generate components sourceMaps when "styles" option is true`, async () => {
      harness.useTarget('server', {
        ...BASE_OPTIONS,
        // Components sourcemaps are only present when optimization is false.
        optimization: false,
        sourceMap: {
          styles: true,
          scripts: true,
        },
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBe(true);
      harness.expectFile('dist/main.js.map').toExist();
      harness.expectFile('dist/main.js').content.toContain('sourceMappingURL=main.js.map');
      harness
        .expectFile('dist/main.js')
        .content.toContain('sourceMappingURL=data:application/json');
    });

    it(`should generate components sourceMaps when "styles" option is unset`, async () => {
      harness.useTarget('server', {
        ...BASE_OPTIONS,
        // Components sourcemaps are only present when optimization is false.
        optimization: false,
        sourceMap: {
          scripts: true,
        },
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBe(true);
      harness.expectFile('dist/main.js.map').toExist();
      harness.expectFile('dist/main.js').content.toContain('sourceMappingURL=main.js.map');
      harness.expectFile('dist/main.js').content.toContain(INLINE_SOURCEMAP_MARKER);
    });

    it(`should generate scripts sourceMaps when "scripts" option is unset`, async () => {
      harness.useTarget('server', {
        ...BASE_OPTIONS,
        sourceMap: {},
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBe(true);
      harness.expectFile('dist/main.js.map').toExist();
      harness.expectFile('dist/main.js').content.toContain('sourceMappingURL=main.js.map');
    });

    it(`should not generate scripts sourceMaps when "scripts" option is false`, async () => {
      harness.useTarget('server', {
        ...BASE_OPTIONS,
        sourceMap: {
          scripts: false,
        },
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBe(true);
      harness.expectFile('dist/main.js.map').toNotExist();
      harness.expectFile('dist/main.js').content.not.toContain('sourceMappingURL=main.js.map');
    });

    it(`should generate scripts sourceMaps when "scripts" option is true`, async () => {
      harness.useTarget('server', {
        ...BASE_OPTIONS,
        sourceMap: {
          scripts: true,
        },
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBe(true);
      harness.expectFile('dist/main.js.map').toExist();
      harness.expectFile('dist/main.js').content.toContain('sourceMappingURL=main.js.map');
    });
  });
});
