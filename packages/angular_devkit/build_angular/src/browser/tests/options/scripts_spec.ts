/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:no-big-function
import { buildWebpackBrowser } from '../../index';
import { BASE_OPTIONS, BROWSER_BUILDER_INFO, describeBuilder } from '../setup';

describeBuilder(buildWebpackBrowser, BROWSER_BUILDER_INFO, (harness) => {
  describe('Option: "scripts"', () => {
    beforeEach(async () => {
      // Application code is not needed for scripts tests
      await harness.writeFile('src/main.ts', '');
    });

    it('supports an empty array value', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        scripts: [],
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBe(true);
    });

    describe('shorthand syntax', () => {
      it('processes a single script into a single output', async () => {
        await harness.writeFile('src/test-script-a.js', 'console.log("a");');

        harness.useTarget('build', {
          ...BASE_OPTIONS,
          scripts: ['src/test-script-a.js'],
        });

        const { result } = await harness.executeOnce();

        expect(result?.success).toBe(true);

        harness.expectFile('dist/scripts.js').content.toContain('console.log("a")');
        harness
          .expectFile('dist/index.html')
          .content.toContain('<script src="scripts.js" defer></script>');
      });

      it('processes multiple scripts into a single output', async () => {
        await harness.writeFile('src/test-script-a.js', 'console.log("a");');
        await harness.writeFile('src/test-script-b.js', 'console.log("b");');

        harness.useTarget('build', {
          ...BASE_OPTIONS,
          scripts: ['src/test-script-a.js', 'src/test-script-b.js'],
        });

        const { result } = await harness.executeOnce();

        expect(result?.success).toBe(true);

        harness.expectFile('dist/scripts.js').content.toContain('console.log("a")');
        harness.expectFile('dist/scripts.js').content.toContain('console.log("b")');
        harness
          .expectFile('dist/index.html')
          .content.toContain('<script src="scripts.js" defer></script>');
      });

      it('preserves order of multiple scripts in single output', async () => {
        await harness.writeFile('src/test-script-a.js', 'console.log("a");');
        await harness.writeFile('src/test-script-b.js', 'console.log("b");');
        await harness.writeFile('src/test-script-c.js', 'console.log("c");');
        await harness.writeFile('src/test-script-d.js', 'console.log("d");');

        harness.useTarget('build', {
          ...BASE_OPTIONS,
          scripts: [
            'src/test-script-c.js',
            'src/test-script-d.js',
            'src/test-script-b.js',
            'src/test-script-a.js',
          ],
        });

        const { result } = await harness.executeOnce();

        expect(result?.success).toBe(true);

        harness
          .expectFile('dist/scripts.js')
          .content.toMatch(
            /console\.log\("c"\)[;\s]+console\.log\("d"\)[;\s]+console\.log\("b"\)[;\s]+console\.log\("a"\)/,
          );
      });

      it('throws an exception if script does not exist', async () => {
        harness.useTarget('build', {
          ...BASE_OPTIONS,
          scripts: ['src/test-script-a.js'],
        });

        const { result, error } = await harness.executeOnce({ outputLogsOnException: false });

        expect(result).toBeUndefined();
        expect(error).toEqual(
          jasmine.objectContaining({
            message: jasmine.stringMatching(`Script file src/test-script-a.js does not exist.`),
          }),
        );

        harness.expectFile('dist/scripts.js').toNotExist();
      });

      it('shows the output script as a chunk entry in the logging output', async () => {
        await harness.writeFile('src/test-script-a.js', 'console.log("a");');

        harness.useTarget('build', {
          ...BASE_OPTIONS,
          scripts: ['src/test-script-a.js'],
        });

        const { result, logs } = await harness.executeOnce();

        expect(result?.success).toBe(true);

        expect(logs).toContain(
          jasmine.objectContaining({ message: jasmine.stringMatching(/scripts\.js.+\d+ bytes/) }),
        );
      });
    });
  });
});
