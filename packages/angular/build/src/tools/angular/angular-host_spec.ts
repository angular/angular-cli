/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import ts from 'typescript';
import {
  type AngularHostOptions,
  createAngularCompilerHost,
  ensureSourceFileVersions,
} from './angular-host';

describe('angular-host', () => {
  const baseHostOptions: AngularHostOptions = {
    transformStylesheet: async () => null,
    processWebWorker: (workerFile) => workerFile,
  };

  describe('createAngularCompilerHost', () => {
    it('wires resolveModuleNameLiterals with resolutionCache and packageJsonCache when fileReplacements is undefined', () => {
      const compilerOptions: ts.CompilerOptions = {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ES2022,
      };
      const packageJsonCache = ts
        .createModuleResolutionCache('/workspace', (fileName) => fileName)
        .getPackageJsonInfoCache();
      const resolveSpy = jasmine.createSpy('resolveModuleName').and.returnValue({
        resolvedModule: {
          resolvedFileName: '/workspace/src/dep.ts',
          isExternalLibraryImport: false,
          extension: ts.Extension.Ts,
        },
      });
      const mockTs = { ...ts, resolveModuleName: resolveSpy } as unknown as typeof ts;

      const host = createAngularCompilerHost(
        mockTs,
        compilerOptions,
        baseHostOptions,
        packageJsonCache,
      );
      const resolutionCache = host.getModuleResolutionCache?.();

      expect(resolutionCache).toBeDefined();
      expect(resolutionCache?.getPackageJsonInfoCache()).toBe(packageJsonCache);
      expect(host.resolveModuleNameLiterals).toBeDefined();

      const containingSourceFile = ts.createSourceFile(
        '/workspace/src/index.ts',
        "import './dep';",
        ts.ScriptTarget.ES2022,
      );
      containingSourceFile.impliedNodeFormat = ts.ModuleKind.ESNext;

      const resolved = host.resolveModuleNameLiterals?.(
        [ts.factory.createStringLiteral('./dep')],
        '/workspace/src/index.ts',
        undefined,
        compilerOptions,
        containingSourceFile,
        undefined,
      );

      expect(resolved).toEqual([
        {
          resolvedModule: {
            resolvedFileName: '/workspace/src/dep.ts',
            isExternalLibraryImport: false,
            extension: ts.Extension.Ts,
          },
        },
      ]);
      expect(resolveSpy).toHaveBeenCalledOnceWith(
        './dep',
        '/workspace/src/index.ts',
        compilerOptions,
        host,
        resolutionCache,
        undefined,
        ts.ModuleKind.ESNext,
      );
    });

    it('wires resolveModuleNameLiterals with resolutionCache when fileReplacements is empty', () => {
      const compilerOptions: ts.CompilerOptions = {
        target: ts.ScriptTarget.ES2022,
      };
      const resolveSpy = jasmine.createSpy('resolveModuleName').and.returnValue({
        resolvedModule: undefined,
      });
      const mockTs = { ...ts, resolveModuleName: resolveSpy } as unknown as typeof ts;

      const host = createAngularCompilerHost(
        mockTs,
        compilerOptions,
        { ...baseHostOptions, fileReplacements: {} },
        undefined,
      );
      const resolutionCache = host.getModuleResolutionCache?.();
      const containingSourceFile = ts.createSourceFile(
        '/workspace/src/index.ts',
        "import './missing';",
        ts.ScriptTarget.ES2022,
      );

      expect(host.resolveModuleNameLiterals).toBeDefined();
      host.resolveModuleNameLiterals?.(
        [ts.factory.createStringLiteral('./missing')],
        '/workspace/src/index.ts',
        undefined,
        compilerOptions,
        containingSourceFile,
        undefined,
      );

      expect(resolveSpy).toHaveBeenCalledOnceWith(
        './missing',
        '/workspace/src/index.ts',
        compilerOptions,
        host,
        resolutionCache,
        undefined,
        undefined,
      );
    });

    it('applies fileReplacements while still using resolutionCache', () => {
      const compilerOptions: ts.CompilerOptions = {
        target: ts.ScriptTarget.ES2022,
      };
      const resolveSpy = jasmine.createSpy('resolveModuleName').and.returnValue({
        resolvedModule: {
          resolvedFileName: '/workspace/src/env.ts',
          isExternalLibraryImport: false,
          extension: ts.Extension.Ts,
        },
      });
      const mockTs = { ...ts, resolveModuleName: resolveSpy } as unknown as typeof ts;

      const host = createAngularCompilerHost(
        mockTs,
        compilerOptions,
        {
          ...baseHostOptions,
          fileReplacements: {
            '/workspace/src/env.ts': '/workspace/src/env.prod.ts',
          },
        },
        undefined,
      );
      const resolutionCache = host.getModuleResolutionCache?.();
      const containingSourceFile = ts.createSourceFile(
        '/workspace/src/index.ts',
        "import './env';",
        ts.ScriptTarget.ES2022,
      );

      const resolved = host.resolveModuleNameLiterals?.(
        [ts.factory.createStringLiteral('./env')],
        '/workspace/src/index.ts',
        undefined,
        compilerOptions,
        containingSourceFile,
        undefined,
      );

      expect(resolved).toEqual([
        {
          resolvedModule: {
            resolvedFileName: '/workspace/src/env.prod.ts',
            isExternalLibraryImport: false,
            extension: ts.Extension.Ts,
          },
        },
      ]);
      expect(resolveSpy).toHaveBeenCalledOnceWith(
        './env',
        '/workspace/src/index.ts',
        compilerOptions,
        host,
        resolutionCache,
        undefined,
        undefined,
      );
    });
  });

  describe('ensureSourceFileVersions', () => {
    it('computes missing versions upfront and does not retain previousProgram on program', () => {
      const existingSf = ts.createSourceFile(
        '/src/existing.ts',
        'export const a = 1;',
        ts.ScriptTarget.ES2022,
      ) as ts.SourceFile & { version?: string };
      existingSf.version = 'existing-version';

      const reusedFromPrevSf = ts.createSourceFile(
        '/src/reused.ts',
        'export const b = 2;',
        ts.ScriptTarget.ES2022,
      ) as ts.SourceFile & { version?: string };

      const freshSf = ts.createSourceFile(
        '/src/fresh.ts',
        'export const c = 3;',
        ts.ScriptTarget.ES2022,
      ) as ts.SourceFile & { version?: string };

      const ttcSf = ts.createSourceFile(
        '/src/reused.ngtypecheck.ts',
        'export const ttc = 1;',
        ts.ScriptTarget.ES2022,
      ) as ts.SourceFile & { version?: string };

      const getSourceFiles = () => [existingSf, reusedFromPrevSf, freshSf, ttcSf];
      const program = {
        getSourceFiles,
      } as unknown as ts.Program;

      const getSourceFileSpy = jasmine
        .createSpy('getSourceFile')
        .and.callFake((fileName: string) => {
          if (fileName === '/src/reused.ts') {
            return { version: 'previous-version' } as unknown as ts.SourceFile;
          }

          return undefined;
        });
      const previousProgram = {
        getSourceFile: getSourceFileSpy,
      } as unknown as ts.BuilderProgram;

      ensureSourceFileVersions(program, previousProgram);

      // Versions should be populated immediately without requiring another getSourceFiles() call
      expect(existingSf.version).toBe('existing-version');
      expect(reusedFromPrevSf.version).toBe('previous-version');
      expect(freshSf.version).toBeDefined();
      expect(ttcSf.version).toBeDefined();
      expect(ttcSf.version).not.toBe('previous-version');

      // previousProgram should only be queried for non-.ngtypecheck.ts files lacking a version
      expect(getSourceFileSpy).toHaveBeenCalledTimes(2);
      expect(getSourceFileSpy).toHaveBeenCalledWith('/src/reused.ts');
      expect(getSourceFileSpy).toHaveBeenCalledWith('/src/fresh.ts');

      // program.getSourceFiles must not be wrapped in a closure retaining previousProgram
      expect(program.getSourceFiles).toBe(getSourceFiles);

      getSourceFileSpy.calls.reset();
      program.getSourceFiles();
      expect(getSourceFileSpy).not.toHaveBeenCalled();
    });
  });
});
