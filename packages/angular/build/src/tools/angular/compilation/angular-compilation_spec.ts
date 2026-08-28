/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import ts from 'typescript';
import type { AngularHostOptions } from '../angular-host';
import { transformCompilerOptions } from './compiler-options';
import { TypeScriptCompilation } from './typescript-compilation';
import {
  AngularCompilation,
  AngularCompilationResult,
  DiagnosticModes,
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
      const result = await compilation.initialize('tsconfig.json', mockHostOptions);

      expect(result.referencedFiles).toEqual([]);
      expect(result.compilerOptions).toBeDefined();
    });

    it('initializes with CompilerOptionOverrides object', async () => {
      const compilation = new NoopCompilation();
      const mockHostOptions = {} as AngularHostOptions;
      const result = await compilation.initialize('tsconfig.json', mockHostOptions, {
        sourcemap: true,
        enableHmr: true,
      });

      expect(result.referencedFiles).toEqual([]);
      expect(result.compilerOptions.inlineSources).toBe(true);
      expect(result.compilerOptions.inlineSourceMap).toBe(true);
      expect(result.compilerOptions['_enableHmr']).toBe(true);
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

  describe('transformCompilerOptions', () => {
    it('does not mutate the input compiler options object', () => {
      const originalOptions: ts.CompilerOptions = {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.CommonJS,
      };
      const originalCopy = { ...originalOptions };

      transformCompilerOptions(ts, originalOptions);

      expect(originalOptions).toEqual(originalCopy);
    });

    it('sets target to ES2022 and useDefineForClassFields to false when target is undefined', () => {
      const { compilerOptions, warnings } = transformCompilerOptions(
        ts,
        { module: ts.ModuleKind.ES2022 },
        undefined,
        'tsconfig.json',
      );

      expect(compilerOptions.target).toBe(ts.ScriptTarget.ES2022);
      expect(compilerOptions.useDefineForClassFields).toBe(false);
      expect(warnings.length).toBe(1);
      expect(warnings[0].text).toContain(
        "TypeScript compiler options 'target' and 'useDefineForClassFields'",
      );
      expect(warnings[0].location?.file).toBe('tsconfig.json');
    });

    it('preserves existing useDefineForClassFields if target < ES2022', () => {
      const { compilerOptions, warnings } = transformCompilerOptions(
        ts,
        {
          target: ts.ScriptTarget.ES2020,
          useDefineForClassFields: true,
          module: ts.ModuleKind.ES2022,
        },
        undefined,
        'tsconfig.json',
      );

      expect(compilerOptions.target).toBe(ts.ScriptTarget.ES2022);
      expect(compilerOptions.useDefineForClassFields).toBe(true);
      expect(warnings.length).toBe(1);
    });

    it('sets compilationMode to full and warns when compilationMode is partial', () => {
      const { compilerOptions, warnings } = transformCompilerOptions(ts, {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ES2022,
        compilationMode: 'partial',
      });

      expect(compilerOptions.compilationMode).toBe('full');
      expect(warnings.length).toBe(1);
      expect(warnings[0].text).toContain('Angular partial compilation mode is not supported');
    });

    it('configures incremental and tsBuildInfoFile when cachePath is provided', () => {
      const { compilerOptions } = transformCompilerOptions(
        ts,
        { target: ts.ScriptTarget.ES2022 },
        { cachePath: '/tmp/cache' },
      );

      expect(compilerOptions.incremental).toBe(true);
      expect(compilerOptions.tsBuildInfoFile).toContain('.tsbuildinfo');
    });

    it('sets incremental to false when cachePath is not provided or incremental is false', () => {
      const { compilerOptions: opt1 } = transformCompilerOptions(
        ts,
        { target: ts.ScriptTarget.ES2022 },
        undefined,
      );
      expect(opt1.incremental).toBe(false);

      const { compilerOptions: opt2 } = transformCompilerOptions(
        ts,
        { target: ts.ScriptTarget.ES2022, incremental: false },
        { cachePath: '/tmp/cache' },
      );
      expect(opt2.incremental).toBe(false);
    });

    it('sets module to ES2022 and warns when module < ES2015', () => {
      const { compilerOptions, warnings } = transformCompilerOptions(ts, {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
      });

      expect(compilerOptions.module).toBe(ts.ModuleKind.ES2022);
      expect(warnings.length).toBe(1);
      expect(warnings[0].text).toContain(
        "TypeScript compiler options 'module' values 'CommonJS', 'UMD'",
      );
    });

    it('warns when isolatedModules is enabled with emitDecoratorMetadata', () => {
      const { warnings } = transformCompilerOptions(ts, {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ES2022,
        isolatedModules: true,
        emitDecoratorMetadata: true,
      });

      expect(warnings.length).toBe(1);
      expect(warnings[0].text).toContain(
        "TypeScript compiler option 'isolatedModules' may prevent",
      );
    });

    it('synchronizes customConditions when moduleResolution is Bundler or module is Preserve', () => {
      const { compilerOptions: bundlerOptions } = transformCompilerOptions(
        ts,
        { target: ts.ScriptTarget.ES2022, moduleResolution: ts.ModuleResolutionKind.Bundler },
        { customConditions: ['development'] },
      );
      expect(bundlerOptions.customConditions).toEqual(['development']);

      const { compilerOptions: preserveOptions } = transformCompilerOptions(
        ts,
        { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.Preserve },
        { customConditions: ['development'] },
      );
      expect(preserveOptions.customConditions).toEqual(['development']);
    });

    it('applies override options correctly', () => {
      const { compilerOptions } = transformCompilerOptions(
        ts,
        { target: ts.ScriptTarget.ES2022, isolatedModules: true },
        {
          sourcemap: true,
          preserveSymlinks: true,
          externalRuntimeStyles: true,
          enableHmr: true,
          instrumentForCoverage: true,
          includeTestMetadata: true,
        },
      );

      expect(compilerOptions.inlineSources).toBe(true);
      expect(compilerOptions.inlineSourceMap).toBe(true);
      expect(compilerOptions.preserveSymlinks).toBe(true);
      expect(compilerOptions.externalRuntimeStyles).toBe(true);
      expect(compilerOptions['_enableHmr']).toBe(true);
      expect(compilerOptions['_useTypeScriptTranspilation']).toBe(true);
      expect(compilerOptions.supportTestBed).toBe(true);
      expect(compilerOptions.supportJitMode).toBe(true);
      expect(compilerOptions.noEmitOnError).toBe(false);
      expect(compilerOptions.composite).toBe(false);
    });
  });
});
