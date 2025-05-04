/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { buildApplication } from '../../index';
import { APPLICATION_BUILDER_INFO, BASE_OPTIONS, describeBuilder } from '../setup';

describeBuilder(buildApplication, APPLICATION_BUILDER_INFO, (harness) => {
  describe('Option: "browser"', () => {
    it('uses a provided TypeScript file', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        browser: 'src/main.ts',
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBe(true);

      harness.expectFile('dist/browser/main.js').toExist();
      harness.expectFile('dist/browser/index.html').toExist();
    });

    it('uses a provided JavaScript file', async () => {
      await harness.writeFile('src/main.js', `console.log('main');`);

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        browser: 'src/main.js',
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBe(true);

      harness.expectFile('dist/browser/main.js').toExist();
      harness.expectFile('dist/browser/index.html').toExist();
      harness.expectFile('dist/browser/main.js').content.toContain('console.log("main")');
    });

    it('defaults to use `src/main.ts` if not present', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        browser: undefined,
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBe(true);

      harness.expectFile('dist/browser/main.js').toExist();
      harness.expectFile('dist/browser/index.html').toExist();
    });

    it('uses project source root in default if `browser` not present', async () => {
      harness.useProject('test', {
        root: '.',
        sourceRoot: 'source',
        cli: {
          cache: {
            enabled: false,
          },
        },
      });
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        browser: undefined,
        index: false,
      });

      // Update app for a `source/main.ts` file based on the above changed `sourceRoot`
      await harness.writeFile('source/main.ts', `console.log('main');`);
      await harness.modifyFile('src/tsconfig.app.json', (content) =>
        content.replace('main.ts', '../source/main.ts'),
      );

      const { result } = await harness.executeOnce();

      expect(result?.success).toBe(true);

      harness.expectFile('dist/browser/main.js').content.toContain('console.log("main")');
    });

    it('fails and shows an error when file does not exist', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        browser: 'src/missing.ts',
      });

      const { result, logs } = await harness.executeOnce({ outputLogsOnFailure: false });

      expect(result?.success).toBe(false);
      expect(logs).toContain(
        jasmine.objectContaining({ message: jasmine.stringMatching('Could not resolve "') }),
      );

      harness.expectFile('dist/browser/main.js').toNotExist();
      harness.expectFile('dist/browser/index.html').toNotExist();
    });

    it('throws an error when given an empty string', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        browser: '',
      });

      const { result, error } = await harness.executeOnce({ outputLogsOnException: false });
      expect(result).toBeUndefined();

      expect(error?.message).toContain('cannot be an empty string');
    });

    it('resolves an absolute path as relative inside the workspace root', async () => {
      await harness.writeFile('file.mjs', `console.log('Hello!');`);

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        browser: '/file.mjs',
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      // Always uses the name `main.js` for the `browser` option.
      harness.expectFile('dist/browser/main.js').toExist();
    });
  });
});
