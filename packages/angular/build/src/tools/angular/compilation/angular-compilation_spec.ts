/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import ts from 'typescript';
import type { AngularHostOptions } from '../angular-host';
import {
  AngularCompilation,
  AngularCompilationResult,
  DiagnosticModes,
  NoopCompilation,
  TypeScriptCompilation,
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

    it('throws when calling emitAffectedFiles', () => {
      const compilation = new NoopCompilation();
      expect(() => compilation.emitAffectedFiles()).toThrowError(
        'Not available when using noop compilation.',
      );
    });

    it('returns empty diagnostics from diagnoseFiles', async () => {
      const compilation = new NoopCompilation();
      const diagnostics = await compilation.diagnoseFiles();
      expect(diagnostics).toEqual({});
    });
  });

  describe('TypeScriptCompilation', () => {
    class MockTypeScriptCompilation extends TypeScriptCompilation {
      async initialize(): Promise<AngularCompilationResult> {
        return { compilerOptions: {}, referencedFiles: [] };
      }

      protected override *collectDiagnostics(modes: DiagnosticModes): Iterable<ts.Diagnostic> {
        if (modes & DiagnosticModes.Option) {
          yield {
            category: ts.DiagnosticCategory.Error,
            code: 1234,
            messageText: 'Mock option error',
            file: undefined,
            start: undefined,
            length: undefined,
          };
        }
        if (modes & DiagnosticModes.Semantic) {
          yield {
            category: ts.DiagnosticCategory.Warning,
            code: 5678,
            messageText: 'Mock semantic warning',
            file: undefined,
            start: undefined,
            length: undefined,
          };
        }
      }

      public getCachedSourceFiles(): Map<string, ts.SourceFile> {
        return this.sourceFiles;
      }
    }

    it('collects and converts diagnostics categorized by error and warning', async () => {
      const compilation = new MockTypeScriptCompilation();
      const diagnostics = await compilation.diagnoseFiles(DiagnosticModes.All);

      expect(diagnostics.errors?.length).toBe(1);
      expect(diagnostics.errors?.[0].text).toContain('Mock option error');
      expect(diagnostics.warnings?.length).toBe(1);
      expect(diagnostics.warnings?.[0].text).toContain('Mock semantic warning');
    });

    it('filters diagnostics according to requested DiagnosticModes', async () => {
      const compilation = new MockTypeScriptCompilation();
      const diagnostics = await compilation.diagnoseFiles(DiagnosticModes.Option);

      expect(diagnostics.errors?.length).toBe(1);
      expect(diagnostics.errors?.[0].text).toContain('Mock option error');
      expect(diagnostics.warnings).toBeUndefined();
    });

    it('returns empty diagnostics immediately when mode is DiagnosticModes.None', async () => {
      const compilation = new MockTypeScriptCompilation();
      const diagnostics = await compilation.diagnoseFiles(DiagnosticModes.None);

      expect(diagnostics).toEqual({});
    });

    it('evicts files from AST cache on update and invalidateFiles', async () => {
      const compilation = new MockTypeScriptCompilation();
      const mockSourceFile = ts.createSourceFile('test.ts', '', ts.ScriptTarget.Latest);
      compilation.getCachedSourceFiles().set('/src/test.ts', mockSourceFile);

      expect(compilation.getCachedSourceFiles().has('/src/test.ts')).toBeTrue();

      await compilation.update?.(new Set(['/src/test.ts']));
      expect(compilation.getCachedSourceFiles().has('/src/test.ts')).toBeFalse();
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
