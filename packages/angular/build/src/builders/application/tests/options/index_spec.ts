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
  describe('Option: "index"', () => {
    beforeEach(async () => {
      await harness.writeFile('src/main.ts', 'console.log("TEST");');
    });

    describe('short form syntax', () => {
      it('should not generate an output file when false', async () => {
        harness.useTarget('build', {
          ...BASE_OPTIONS,
          index: false,
        });

        const { result } = await harness.executeOnce();

        expect(result?.success).toBe(true);

        harness.expectFile('dist/browser/index.html').toNotExist();
      });

      // TODO: This fails option validation when used in the CLI but not when used directly
      xit('should fail build when true', async () => {
        harness.useTarget('build', {
          ...BASE_OPTIONS,
          index: true,
        });

        const { result, logs } = await harness.executeOnce({ outputLogsOnFailure: false });

        expect(result?.success).toBe(false);
        harness.expectFile('dist/browser/index.html').toNotExist();
        expect(logs).toContain(
          jasmine.objectContaining({ message: jasmine.stringMatching('Schema validation failed') }),
        );
      });

      it('should use the provided file path to generate the output file when a string path', async () => {
        harness.useTarget('build', {
          ...BASE_OPTIONS,
          index: 'src/index.html',
        });

        await harness.writeFile(
          'src/index.html',
          '<html><head><title>TEST_123</title></head><body></body>',
        );

        const { result } = await harness.executeOnce();

        expect(result?.success).toBe(true);
        harness.expectFile('dist/browser/index.html').content.toContain('TEST_123');
      });

      it('should use the the index.html file within the project source root when not present', async () => {
        harness.useTarget('build', {
          ...BASE_OPTIONS,
          index: undefined,
        });

        await harness.writeFile(
          'src/index.html',
          '<html><head><title>TEST_123</title></head><body></body>',
        );

        const { result } = await harness.executeOnce();

        expect(result?.success).toBe(true);
        harness.expectFile('dist/browser/index.html').content.toContain('TEST_123');
      });

      // TODO: Build needs to be fixed to not throw an unhandled exception for this case
      xit('should fail build when a string path to non-existent file', async () => {
        harness.useTarget('build', {
          ...BASE_OPTIONS,
          index: 'src/not-here.html',
        });

        const { result } = await harness.executeOnce({ outputLogsOnFailure: false });

        expect(result?.success).toBe(false);
        harness.expectFile('dist/browser/index.html').toNotExist();
      });

      it('should generate initial preload link elements', async () => {
        harness.useTarget('build', {
          ...BASE_OPTIONS,
          index: {
            input: 'src/index.html',
            preloadInitial: true,
          },
        });

        // Setup an initial chunk usage for JS
        await harness.writeFile('src/a.ts', 'console.log("TEST");');
        await harness.writeFile('src/b.ts', 'import "./a";');
        await harness.writeFile('src/main.ts', 'import "./a";\n(() => import("./b"))();');

        const { result } = await harness.executeOnce();

        expect(result?.success).toBe(true);
        harness.expectFile('dist/browser/main.js').content.toContain('chunk-');
        harness.expectFile('dist/browser/index.html').content.toContain('modulepreload');
        harness.expectFile('dist/browser/index.html').content.toContain('chunk-');
      });
    });

    describe('long form syntax', () => {
      it('should use the provided input path to generate the output file when present', async () => {
        harness.useTarget('build', {
          ...BASE_OPTIONS,
          index: {
            input: 'src/index.html',
          },
        });

        await harness.writeFile(
          'src/index.html',
          '<html><head><title>TEST_123</title></head><body></body>',
        );

        const { result } = await harness.executeOnce();

        expect(result?.success).toBe(true);
        harness.expectFile('dist/browser/index.html').content.toContain('TEST_123');
      });

      it('should use the provided output path to generate the output file when present', async () => {
        harness.useTarget('build', {
          ...BASE_OPTIONS,
          index: {
            input: 'src/index.html',
            output: 'output.html',
          },
        });

        await harness.writeFile(
          'src/index.html',
          '<html><head><title>TEST_123</title></head><body></body>',
        );

        const { result } = await harness.executeOnce();

        expect(result?.success).toBe(true);
        harness.expectFile('dist/browser/output.html').content.toContain('TEST_123');
      });
    });

    describe('preload', () => {
      it('should generate initial preload link elements when preloadInitial is true', async () => {
        harness.useTarget('build', {
          ...BASE_OPTIONS,
          index: {
            input: 'src/index.html',
            preloadInitial: true,
          },
        });

        // Setup an initial chunk usage for JS
        await harness.writeFile('src/a.ts', 'console.log("TEST");');
        await harness.writeFile('src/b.ts', 'import "./a";');
        await harness.writeFile('src/main.ts', 'import "./a";\n(() => import("./b"))();');

        const { result } = await harness.executeOnce();

        expect(result?.success).toBe(true);
        harness.expectFile('dist/browser/main.js').content.toContain('chunk-');
        harness.expectFile('dist/browser/index.html').content.toContain('modulepreload');
        harness.expectFile('dist/browser/index.html').content.toContain('chunk-');
      });

      it('should generate initial preload link elements when preloadInitial is undefined', async () => {
        harness.useTarget('build', {
          ...BASE_OPTIONS,
          index: {
            input: 'src/index.html',
            preloadInitial: undefined,
          },
        });

        // Setup an initial chunk usage for JS
        await harness.writeFile('src/a.ts', 'console.log("TEST");');
        await harness.writeFile('src/b.ts', 'import "./a";');
        await harness.writeFile('src/main.ts', 'import "./a";\n(() => import("./b"))();');

        const { result } = await harness.executeOnce();

        expect(result?.success).toBe(true);
        harness.expectFile('dist/browser/main.js').content.toContain('chunk-');
        harness.expectFile('dist/browser/index.html').content.toContain('modulepreload');
        harness.expectFile('dist/browser/index.html').content.toContain('chunk-');
      });

      it('should not generate initial preload link elements when preloadInitial is false', async () => {
        harness.useTarget('build', {
          ...BASE_OPTIONS,
          index: {
            input: 'src/index.html',
            preloadInitial: false,
          },
        });

        // Setup an initial chunk usage for JS
        await harness.writeFile('src/a.ts', 'console.log("TEST");');
        await harness.writeFile('src/b.ts', 'import "./a";');
        await harness.writeFile('src/main.ts', 'import "./a";\n(() => import("./b"))();');

        const { result } = await harness.executeOnce();

        expect(result?.success).toBe(true);
        harness.expectFile('dist/browser/main.js').content.toContain('chunk-');
        harness.expectFile('dist/browser/index.html').content.not.toContain('modulepreload');
        harness.expectFile('dist/browser/index.html').content.not.toContain('chunk-');
      });
    });
  });
});
