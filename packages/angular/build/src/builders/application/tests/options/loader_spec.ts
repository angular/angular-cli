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
  describe('Option: "loader"', () => {
    it('should error for an unknown file extension', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      await harness.writeFile(
        './src/types.d.ts',
        'declare module "*.unknown" { const content: string; export default content; }',
      );
      await harness.writeFile('./src/a.unknown', 'ABC');
      await harness.writeFile(
        'src/main.ts',
        'import contents from "./a.unknown";\n console.log(contents);',
      );

      const { result, logs } = await harness.executeOnce({ outputLogsOnFailure: false });
      expect(result?.success).toBe(false);
      expect(logs).toContain(
        jasmine.objectContaining({
          message: jasmine.stringMatching(
            'No loader is configured for ".unknown" files: src/a.unknown',
          ),
        }),
      );
    });

    it('should not include content for file extension set to "empty"', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        loader: {
          '.unknown': 'empty',
        },
      });

      await harness.writeFile(
        './src/types.d.ts',
        'declare module "*.unknown" { const content: string; export default content; }',
      );
      await harness.writeFile('./src/a.unknown', 'ABC');
      await harness.writeFile(
        'src/main.ts',
        'import contents from "./a.unknown";\n console.log(contents);',
      );

      const { result } = await harness.executeOnce();
      expect(result?.success).toBe(true);
      harness.expectFile('dist/browser/main.js').content.not.toContain('ABC');
    });

    it('should inline text content for file extension set to "text"', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        loader: {
          '.unknown': 'text',
        },
      });

      await harness.writeFile(
        './src/types.d.ts',
        'declare module "*.unknown" { const content: string; export default content; }',
      );
      await harness.writeFile('./src/a.unknown', 'ABC');
      await harness.writeFile(
        'src/main.ts',
        'import contents from "./a.unknown";\n console.log(contents);',
      );

      const { result } = await harness.executeOnce();
      expect(result?.success).toBe(true);
      harness.expectFile('dist/browser/main.js').content.toContain('ABC');
    });

    it('should inline binary content for file extension set to "binary"', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        loader: {
          '.unknown': 'binary',
        },
      });

      await harness.writeFile(
        './src/types.d.ts',
        'declare module "*.unknown" { const content: Uint8Array; export default content; }',
      );
      await harness.writeFile('./src/a.unknown', 'ABC');
      await harness.writeFile(
        'src/main.ts',
        'import contents from "./a.unknown";\n console.log(contents);',
      );

      const { result } = await harness.executeOnce();
      expect(result?.success).toBe(true);
      // Should contain the binary encoding used esbuild and not the text content
      harness.expectFile('dist/browser/main.js').content.toContain('__toBinary("QUJD")');
      harness.expectFile('dist/browser/main.js').content.not.toContain('ABC');
    });

    it('should emit an output file for file extension set to "file"', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        loader: {
          '.unknown': 'file',
        },
      });

      await harness.writeFile(
        './src/types.d.ts',
        'declare module "*.unknown" { const location: string; export default location; }',
      );
      await harness.writeFile('./src/a.unknown', 'ABC');
      await harness.writeFile(
        'src/main.ts',
        'import contents from "./a.unknown";\n console.log(contents);',
      );

      const { result } = await harness.executeOnce();
      expect(result?.success).toBe(true);
      harness.expectFile('dist/browser/main.js').content.toContain('a.unknown');
      harness.expectFile('dist/browser/media/a.unknown').toExist();
    });

    it('should emit an output file with hashing when enabled for file extension set to "file"', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        outputHashing: 'media' as any,
        loader: {
          '.unknown': 'file',
        },
      });

      await harness.writeFile(
        './src/types.d.ts',
        'declare module "*.unknown" { const location: string; export default location; }',
      );
      await harness.writeFile('./src/a.unknown', 'ABC');
      await harness.writeFile(
        'src/main.ts',
        'import contents from "./a.unknown";\n console.log(contents);',
      );

      const { result } = await harness.executeOnce();
      expect(result?.success).toBe(true);
      harness.expectFile('dist/browser/main.js').content.toContain('a.unknown');
      expect(harness.hasFileMatch('dist/browser/media', /a-[0-9A-Z]{8}\.unknown$/)).toBeTrue();
    });

    it('should inline text content for `.txt` by default', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        loader: undefined,
      });

      await harness.writeFile(
        './src/types.d.ts',
        'declare module "*.txt" { const content: string; export default content; }',
      );
      await harness.writeFile('./src/a.txt', 'ABC');
      await harness.writeFile(
        'src/main.ts',
        'import contents from "./a.txt";\n console.log(contents);',
      );

      const { result } = await harness.executeOnce();
      expect(result?.success).toBe(true);
      harness.expectFile('dist/browser/main.js').content.toContain('ABC');
    });

    it('should inline text content for `.txt` by default when other extensions are defined', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        loader: {
          '.unknown': 'binary',
        },
      });

      await harness.writeFile(
        './src/types.d.ts',
        'declare module "*.txt" { const content: string; export default content; }',
      );
      await harness.writeFile('./src/a.txt', 'ABC');
      await harness.writeFile(
        'src/main.ts',
        'import contents from "./a.txt";\n console.log(contents);',
      );

      const { result } = await harness.executeOnce();
      expect(result?.success).toBe(true);
      harness.expectFile('dist/browser/main.js').content.toContain('ABC');
    });

    it('should allow overriding default `.txt` extension behavior', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        loader: {
          '.txt': 'file',
        },
      });

      await harness.writeFile(
        './src/types.d.ts',
        'declare module "*.txt" { const location: string; export default location; }',
      );
      await harness.writeFile('./src/a.txt', 'ABC');
      await harness.writeFile(
        'src/main.ts',
        'import contents from "./a.txt";\n console.log(contents);',
      );

      const { result } = await harness.executeOnce();
      expect(result?.success).toBe(true);
      harness.expectFile('dist/browser/main.js').content.toContain('a.txt');
      harness.expectFile('dist/browser/media/a.txt').toExist();
    });

    // Schema validation will prevent this from happening for supported use-cases.
    // This will only happen if used programmatically and the option value is set incorrectly.
    it('should ignore entry if an invalid loader name is used', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        loader: {
          '.unknown': 'invalid',
        },
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBe(true);
    });

    // Schema validation will prevent this from happening for supported use-cases.
    // This will only happen if used programmatically and the option value is set incorrectly.
    it('should ignore entry if an extension does not start with a period', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        loader: {
          'unknown': 'text',
        },
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBe(true);
    });
  });
});
