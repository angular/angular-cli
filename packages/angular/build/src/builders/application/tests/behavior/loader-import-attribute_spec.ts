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
  describe('Behavior: "loader import attribute"', () => {
    beforeEach(async () => {
      await harness.modifyFile('tsconfig.json', (content) => {
        return content.replace('"module": "ES2022"', '"module": "esnext"');
      });
    });

    it('should inline text content for loader attribute set to "text"', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      await harness.writeFile('./src/a.unknown', 'ABC');
      await harness.writeFile(
        'src/main.ts',
        '// @ts-expect-error\nimport contents from "./a.unknown" with { loader: "text" };\n console.log(contents);',
      );

      const { result } = await harness.executeOnce();
      expect(result?.success).toBe(true);
      harness.expectFile('dist/browser/main.js').content.toContain('ABC');
    });

    it('should inline binary content for loader attribute set to "binary"', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      await harness.writeFile('./src/a.unknown', 'ABC');
      await harness.writeFile(
        'src/main.ts',
        '// @ts-expect-error\nimport contents from "./a.unknown" with { loader: "binary" };\n console.log(contents);',
      );

      const { result } = await harness.executeOnce();
      expect(result?.success).toBe(true);
      // Should contain the binary encoding used esbuild and not the text content
      harness.expectFile('dist/browser/main.js').content.toContain('__toBinary("QUJD")');
      harness.expectFile('dist/browser/main.js').content.not.toContain('ABC');
    });

    it('should inline base64 content for file extension set to "base64"', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      await harness.writeFile('./src/a.unknown', 'ABC');
      await harness.writeFile(
        'src/main.ts',
        '// @ts-expect-error\nimport contents from "./a.unknown" with { loader: "base64" };\n console.log(contents);',
      );

      const { result } = await harness.executeOnce();
      expect(result?.success).toBe(true);
      // Should contain the base64 encoding used esbuild and not the text content
      harness.expectFile('dist/browser/main.js').content.toContain('QUJD');
      harness.expectFile('dist/browser/main.js').content.not.toContain('ABC');
    });

    it('should inline dataurl content for file extension set to "dataurl"', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      await harness.writeFile('./src/a.svg', 'ABC');
      await harness.writeFile(
        'src/main.ts',
        '// @ts-expect-error\nimport contents from "./a.svg" with { loader: "dataurl" };\n console.log(contents);',
      );

      const { result } = await harness.executeOnce();
      expect(result?.success).toBe(true);
      // Should contain the dataurl encoding used esbuild and not the text content
      harness.expectFile('dist/browser/main.js').content.toContain('data:image/svg+xml,ABC');
    });

    it('should emit an output file for loader attribute set to "file"', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      await harness.writeFile('./src/a.unknown', 'ABC');
      await harness.writeFile(
        'src/main.ts',
        '// @ts-expect-error\nimport contents from "./a.unknown" with { loader: "file" };\n console.log(contents);',
      );

      const { result } = await harness.executeOnce();
      expect(result?.success).toBe(true);
      harness.expectFile('dist/browser/main.js').content.toContain('a.unknown');
      harness.expectFile('dist/browser/media/a.unknown').toExist();
    });

    it('should emit an output file with hashing when enabled for loader attribute set to "file"', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        outputHashing: 'media' as any,
      });

      await harness.writeFile('./src/a.unknown', 'ABC');
      await harness.writeFile(
        'src/main.ts',
        '// @ts-expect-error\nimport contents from "./a.unknown" with { loader: "file" };\n console.log(contents);',
      );

      const { result } = await harness.executeOnce();
      expect(result?.success).toBe(true);
      harness.expectFile('dist/browser/main.js').content.toContain('a.unknown');
      expect(harness.hasFileMatch('dist/browser/media', /a-[0-9A-Z]{8}\.unknown$/)).toBeTrue();
    });

    it('should allow overriding default `.txt` extension behavior', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      await harness.writeFile('./src/a.txt', 'ABC');
      await harness.writeFile(
        'src/main.ts',
        '// @ts-expect-error\nimport contents from "./a.txt" with { loader: "file" };\n console.log(contents);',
      );

      const { result } = await harness.executeOnce();
      expect(result?.success).toBe(true);
      harness.expectFile('dist/browser/main.js').content.toContain('a.txt');
      harness.expectFile('dist/browser/media/a.txt').toExist();
    });

    it('should allow overriding default `.js` extension behavior', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      await harness.writeFile('./src/a.js', 'ABC');
      await harness.writeFile(
        'src/main.ts',
        '// @ts-expect-error\nimport contents from "./a.js" with { loader: "file" };\n console.log(contents);',
      );

      const { result } = await harness.executeOnce();
      expect(result?.success).toBe(true);
      harness.expectFile('dist/browser/main.js').content.toContain('a.js');
      harness.expectFile('dist/browser/media/a.js').toExist();
    });

    it('should fail with an error if an invalid loader attribute value is used', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      await harness.writeFile('./src/a.unknown', 'ABC');
      await harness.writeFile(
        'src/main.ts',
        '// @ts-expect-error\nimport contents from "./a.unknown" with { loader: "invalid" };\n console.log(contents);',
      );

      const { result, logs } = await harness.executeOnce({ outputLogsOnFailure: false });
      expect(result?.success).toBe(false);
      expect(logs).toContain(
        jasmine.objectContaining({
          message: jasmine.stringMatching('Unsupported loader import attribute'),
        }),
      );
    });
  });
});
