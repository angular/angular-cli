/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { AngularHostOptions } from '../angular-host';
import {
  AngularCompilation,
  AngularCompilationResult,
  NoopCompilation,
  createAngularCompilation,
} from './index';

describe('AngularCompilation', () => {
  class CustomTransformCompilation extends AngularCompilation {
    override async initialize(): Promise<AngularCompilationResult> {
      return {
        compilerOptions: { allowJs: false },
        referencedFiles: ['/src/main.ts'],
      };
    }

    override async transformFile(filename: string, content: string) {
      if (filename.endsWith('.ts')) {
        return {
          contents: content + '\n// transformed',
          watchFiles: ['/src/dep.ts'],
        };
      }

      return null;
    }
  }

  it('allows implementing on-demand transformFile without collectDiagnostics', async () => {
    const compilation = new CustomTransformCompilation();
    const initResult = await compilation.initialize();

    expect(initResult.referencedFiles).toEqual(['/src/main.ts']);
    expect(initResult.compilerOptions.allowJs).toBe(false);

    const transformResult = await compilation.transformFile?.(
      '/src/main.ts',
      'console.log("hello");',
    );
    expect(transformResult).toEqual({
      contents: 'console.log("hello");\n// transformed',
      watchFiles: ['/src/dep.ts'],
    });

    const diagnostics = await compilation.diagnoseFiles();
    expect(diagnostics).toEqual({});
  });

  describe('NoopCompilation', () => {
    it('initializes with empty referencedFiles and compiler options', async () => {
      const compilation = new NoopCompilation();
      const mockHostOptions = {} as AngularHostOptions;
      const result = await compilation.initialize('tsconfig.json', mockHostOptions, (opts) => ({
        ...opts,
        customOption: true,
      }));

      expect(result.referencedFiles).toEqual([]);
      expect(result.compilerOptions['customOption']).toBe(true);
    });

    it('throws when calling collectDiagnostics or emitAffectedFiles', () => {
      const compilation = new NoopCompilation();
      expect(() =>
        (compilation as unknown as { collectDiagnostics(): unknown }).collectDiagnostics(),
      ).toThrowError('Not available when using noop compilation.');
      expect(() => compilation.emitAffectedFiles()).toThrowError(
        'Not available when using noop compilation.',
      );
    });
  });

  describe('createAngularCompilation', () => {
    it('creates JitCompilation when mode is "jit"', async () => {
      const compilation = await createAngularCompilation('jit', true, false);
      expect(compilation.constructor.name).toBe('JitCompilation');
    });

    it('creates AotCompilation when mode is "aot"', async () => {
      const compilation = await createAngularCompilation('aot', true, false);
      expect(compilation.constructor.name).toBe('AotCompilation');
    });

    it('creates JitCompilation when mode is boolean true (legacy)', async () => {
      const compilation = await createAngularCompilation(true, true, false);
      expect(compilation.constructor.name).toBe('JitCompilation');
    });

    it('creates AotCompilation when mode is boolean false (legacy)', async () => {
      const compilation = await createAngularCompilation(false, true, false);
      expect(compilation.constructor.name).toBe('AotCompilation');
    });

    it('throws when mode is "transform"', async () => {
      await expectAsync(createAngularCompilation('transform', true, false)).toBeRejectedWithError(
        'Transform compilation mode is not supported.',
      );
    });
  });
});
