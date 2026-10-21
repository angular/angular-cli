/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { PartialMessage } from 'esbuild';
import type { AngularHostOptions } from '../../../tools/angular/angular-host';
import {
  type AngularCompilation,
  type AngularCompilationResult,
  DiagnosticModes,
  type EmitFileResult,
} from '../../../tools/angular/compilation';
import type {
  ComponentStylesheetBundler,
  ComponentStylesheetResult,
} from '../../../tools/esbuild/angular/component-stylesheets';
import { BuilderState } from '../builder-state';
import type { NormalizedLibraryOptions } from '../types';
import { compileLibrary } from './compilation';

describe('compileLibrary pipeline', () => {
  const workspaceRoot = '/workspace';
  const projectRoot = '/workspace/projects/my-lib';

  function createOptions(
    overrides: Partial<NormalizedLibraryOptions> = {},
  ): NormalizedLibraryOptions {
    return {
      workspaceRoot,
      projectRoot,
      packageName: 'my-lib',
      packageJson: { name: 'my-lib' },
      outputPath: '/workspace/dist/my-lib',
      deleteOutputPath: true,
      packageJsonPath: '/workspace/projects/my-lib/package.json',
      tsConfigPath: '/workspace/projects/my-lib/tsconfig.lib.json',
      entryPoints: new Map([
        [
          '.',
          {
            subpath: '.',
            name: '.',
            displayName: 'my-lib',
            bundleName: 'my-lib',
            entryFilePath: '/workspace/projects/my-lib/src/public-api.ts',
            isPrimary: true,
          },
        ],
      ]),
      inlineStyleLanguage: 'scss',
      styleIncludePaths: [],
      assets: [],
      compilationMode: 'partial',
      declarationMap: true,
      allowedNonPeerDependencies: [/^tslib$/],
      keepLifecycleScripts: false,
      watch: false,
      preserveSymlinks: false,
      progress: false,
      cacheOptions: {
        enabled: false,
        basePath: '/workspace/.angular/cache',
        path: '/workspace/.angular/cache/my-lib',
      },
      colors: false,
      ...overrides,
    };
  }

  function createStyleResult(
    overrides: {
      errors?: PartialMessage[];
      warnings?: PartialMessage[];
      contents?: string;
      referencedFiles?: Set<string>;
    } = {},
  ): ComponentStylesheetResult {
    return {
      errors: undefined,
      warnings: [],
      contents: '',
      outputFiles: [],
      metafile: { inputs: {}, outputs: {} },
      referencedFiles: new Set(),
      externalImports: new Set(),
      platform: 'browser',
      initialFiles: new Map(),
      ...overrides,
    } as unknown as ComponentStylesheetResult;
  }

  function createMockStateWithCompilation(
    compilationInstance: AngularCompilation,
    esmFiles = new Map<string, string>(),
    dtsFiles = new Map<string, string>(),
  ): BuilderState {
    const state = new BuilderState();
    state.recordCompilationOutput({
      esmFiles,
      dtsFiles,
      changedEsmFiles: new Set(),
      changedDtsFiles: new Set(),
      referencedFiles: new Set(),
      cache: {
        compilationInstance,
        esmFiles,
        dtsFiles,
        failedFiles: new Set(),
      },
      hasStylesheetErrors: false,
      diagnosePromise: Promise.resolve(),
      declarationMap: true,
      compilationMode: 'partial',
    });
    state.resetExecutionResult();

    return state;
  }

  it('should forward warnings from compilationInstance.initialize()', async () => {
    const compilationInstance: AngularCompilation = {
      initialize: jasmine.createSpy('initialize').and.resolveTo({
        compilerOptions: { declarationMap: true, compilationMode: 'partial' },
        referencedFiles: ['/workspace/projects/my-lib/src/public-api.ts'],
        warnings: [
          {
            text: 'Unsupported tsconfig option warning',
            location: {
              file: '/workspace/projects/my-lib/tsconfig.lib.json',
              line: 2,
              column: 4,
            },
          },
        ],
      } satisfies AngularCompilationResult),
      emitAffectedFiles: () => [],
      diagnoseFiles: jasmine.createSpy('diagnoseFiles').and.resolveTo({
        warnings: [
          {
            text: 'NG8107: Optional chain warning',
            location: {
              file: '/workspace/projects/my-lib/src/lib/lib.component.html',
              line: 1,
              column: 1,
            },
          },
        ],
      }),
    };

    const bundler = {
      invalidate: jasmine.createSpy('invalidate'),
      bundleFile: jasmine.createSpy('bundleFile'),
      bundleInline: jasmine.createSpy('bundleInline'),
    } as unknown as ComponentStylesheetBundler;

    const state = createMockStateWithCompilation(compilationInstance);
    const output = await compileLibrary(createOptions(), bundler, state);
    await output.diagnosePromise;

    expect(compilationInstance.diagnoseFiles).toHaveBeenCalledWith(DiagnosticModes.All);

    const warningsText = state.executionResult.warnings.join('\n');
    expect(warningsText).toContain('Unsupported tsconfig option warning');
    expect(warningsText).toContain('NG8107: Optional chain warning');
  });

  it('should run diagnoseFiles when stylesheetErrors are present and catch diagnoseFiles rejections', async () => {
    const compilationInstance: AngularCompilation = {
      initialize: jasmine
        .createSpy('initialize')
        .and.callFake(async (_tsconfig: string, hostOptions: AngularHostOptions) => {
          await hostOptions.transformStylesheet(
            '.broken {',
            '/workspace/projects/my-lib/src/lib/lib.component.ts',
            '/workspace/projects/my-lib/src/lib/lib.component.scss',
          );

          return {
            compilerOptions: { declarationMap: true, compilationMode: 'partial' },
            referencedFiles: ['/workspace/projects/my-lib/src/lib/lib.component.ts'],
          };
        }),
      emitAffectedFiles: jasmine.createSpy('emitAffectedFiles').and.returnValue([]),
      diagnoseFiles: jasmine
        .createSpy('diagnoseFiles')
        .and.rejectWith(new Error('Diagnostic crash')),
    };

    const bundler = {
      invalidate: jasmine.createSpy('invalidate'),
      bundleFile: jasmine.createSpy('bundleFile').and.resolveTo(
        createStyleResult({
          errors: [{ text: 'Sass syntax error' }],
        }),
      ),
      bundleInline: jasmine.createSpy('bundleInline'),
    } as unknown as ComponentStylesheetBundler;

    const state = createMockStateWithCompilation(compilationInstance);
    const output = await compileLibrary(createOptions(), bundler, state);

    expect(output.hasStylesheetErrors).toBeTrue();
    expect(compilationInstance.emitAffectedFiles).not.toHaveBeenCalled();

    await expectAsync(output.diagnosePromise).toBeResolved();
    expect(compilationInstance.diagnoseFiles).toHaveBeenCalledWith(DiagnosticModes.All);

    const errorsText = state.executionResult.errors.join('\n');
    expect(errorsText).toContain('Sass syntax error');
    expect(errorsText).toContain('Angular compilation diagnostics failed.');
    expect(errorsText).toContain('Diagnostic crash');
  });

  it('should pass "css" language to bundleInline when containingFile ends with .html and undefined otherwise', async () => {
    const compilationInstance: AngularCompilation = {
      initialize: jasmine
        .createSpy('initialize')
        .and.callFake(async (_tsconfig: string, hostOptions: AngularHostOptions) => {
          await hostOptions.transformStylesheet(
            'p { color: red; }',
            '/workspace/projects/my-lib/src/lib/lib.component.html',
          );
          await hostOptions.transformStylesheet(
            '$c: blue; p { color: $c; }',
            '/workspace/projects/my-lib/src/lib/lib.component.ts',
          );

          return {
            compilerOptions: { declarationMap: false, compilationMode: 'partial' },
            referencedFiles: ['/workspace/projects/my-lib/src/lib/lib.component.ts'],
          };
        }),
      emitAffectedFiles: () => [],
      diagnoseFiles: async () => ({}),
    };

    const bundleInlineSpy = jasmine
      .createSpy('bundleInline')
      .and.resolveTo(createStyleResult({ contents: 'p{color:red}' }));
    const bundler = {
      invalidate: jasmine.createSpy('invalidate'),
      bundleFile: jasmine.createSpy('bundleFile'),
      bundleInline: bundleInlineSpy,
    } as unknown as ComponentStylesheetBundler;

    const state = createMockStateWithCompilation(compilationInstance);
    const output = await compileLibrary(createOptions(), bundler, state);
    await output.diagnosePromise;

    expect(bundleInlineSpy).toHaveBeenCalledTimes(2);
    expect(bundleInlineSpy.calls.argsFor(0)).toEqual([
      'p { color: red; }',
      '/workspace/projects/my-lib/src/lib/lib.component.html',
      'css',
    ]);
    expect(bundleInlineSpy.calls.argsFor(1)).toEqual([
      '$c: blue; p { color: $c; }',
      '/workspace/projects/my-lib/src/lib/lib.component.ts',
      undefined,
    ]);
  });

  it('should preserve existing file references when stylesheet bundling fails and replace them when bundling succeeds', async () => {
    const compTs = '/workspace/projects/my-lib/src/lib/lib.component.ts';
    const compScss = '/workspace/projects/my-lib/src/lib/lib.component.scss';
    const partialOld = '/workspace/projects/my-lib/src/lib/_old.scss';
    const partialNew = '/workspace/projects/my-lib/src/lib/_new.scss';

    let shouldFailBundle = true;
    const compilationInstance: AngularCompilation = {
      update: jasmine.createSpy('update').and.resolveTo(),
      initialize: jasmine
        .createSpy('initialize')
        .and.callFake(async (_tsconfig: string, hostOptions: AngularHostOptions) => {
          await hostOptions.transformStylesheet('', compTs, compScss);

          return {
            compilerOptions: { declarationMap: false, compilationMode: 'partial' },
            referencedFiles: [compTs],
          };
        }),
      emitAffectedFiles: () => [],
      diagnoseFiles: async () => ({}),
    };

    const bundler = {
      invalidate: jasmine.createSpy('invalidate'),
      bundleFile: jasmine.createSpy('bundleFile').and.callFake(async () => {
        if (shouldFailBundle) {
          return createStyleResult({
            errors: [{ text: 'Sass error before reaching import' }],
            referencedFiles: new Set([compScss]),
          });
        }

        return createStyleResult({
          contents: '.ok {}',
          referencedFiles: new Set([compScss, partialNew]),
        });
      }),
      bundleInline: jasmine.createSpy('bundleInline'),
    } as unknown as ComponentStylesheetBundler;

    const state = createMockStateWithCompilation(compilationInstance);
    // Record initial references from a prior successful build
    state.addFileReferences(compScss, [compScss, partialOld]);

    // 1. Rebuild where stylesheet bundling fails: old reference (`partialOld`) must be preserved
    const failedOutput = await compileLibrary(
      createOptions(),
      bundler,
      state,
      new Set([compTs, compScss]),
    );
    await failedOutput.diagnosePromise;
    state.recordCompilationOutput(failedOutput);

    expect(state.getAffectedFiles([partialOld])).toEqual(new Set([partialOld, compScss]));

    // 2. Rebuild where stylesheet bundling succeeds with `partialNew` instead of `partialOld`
    state.resetExecutionResult();
    shouldFailBundle = false;
    const successOutput = await compileLibrary(
      createOptions(),
      bundler,
      state,
      new Set([compTs, compScss]),
    );
    await successOutput.diagnosePromise;
    state.recordCompilationOutput(successOutput);

    // `partialOld` should no longer mark `compScss` as affected
    expect(state.getAffectedFiles([partialOld])).toEqual(new Set([partialOld]));
    // `partialNew` should now mark `compScss` as affected
    expect(state.getAffectedFiles([partialNew])).toEqual(new Set([partialNew, compScss]));
  });

  it('should mark .d.ts as changed in changedDtsFiles when .d.ts.map changes', async () => {
    const dtsPath = '/workspace/projects/my-lib/src/lib/lib.component.d.ts';
    const dtsMapPath = '/workspace/projects/my-lib/src/lib/lib.component.d.ts.map';
    const jsPath = '/workspace/projects/my-lib/src/lib/lib.component.js';

    const esmFiles = new Map<string, string>([[jsPath, 'export class LibComponent {}']]);
    const dtsFiles = new Map<string, string>([
      [dtsPath, 'export declare class LibComponent {}\n'],
      [dtsMapPath, '{"version":3,"mappings":"AAAA"}'],
    ]);

    let emitted: EmitFileResult[] = [
      { filename: jsPath, contents: 'export class LibComponent { static ɵcmp = 1; }' },
      { filename: dtsPath, contents: 'export declare class LibComponent {}\n' },
      { filename: dtsMapPath, contents: '{"version":3,"mappings":"AACA"}' },
    ];

    const compilationInstance: AngularCompilation = {
      initialize: async () => ({
        compilerOptions: { declarationMap: true, compilationMode: 'partial' },
        referencedFiles: ['/workspace/projects/my-lib/src/lib/lib.component.ts'],
      }),
      emitAffectedFiles: () => emitted,
      diagnoseFiles: async () => ({}),
    };

    const bundler = {
      invalidate: jasmine.createSpy('invalidate'),
      bundleFile: jasmine.createSpy('bundleFile'),
      bundleInline: jasmine.createSpy('bundleInline'),
    } as unknown as ComponentStylesheetBundler;

    const state = createMockStateWithCompilation(compilationInstance, esmFiles, dtsFiles);

    // Case 1: .d.ts is identical, only .d.ts.map and .js changed
    const output1 = await compileLibrary(createOptions(), bundler, state);
    await output1.diagnosePromise;

    expect(output1.changedEsmFiles).toEqual(new Set([jsPath]));
    expect(output1.changedDtsFiles).toEqual(new Set([dtsPath]));
    expect(output1.dtsFiles.get(dtsMapPath)).toBe('{"version":3,"mappings":"AACA"}');

    // Case 2: neither .d.ts nor .d.ts.map changed
    emitted = [
      { filename: dtsPath, contents: 'export declare class LibComponent {}\n' },
      { filename: dtsMapPath, contents: '{"version":3,"mappings":"AACA"}' },
    ];
    const output2 = await compileLibrary(createOptions(), bundler, state);
    await output2.diagnosePromise;

    expect(output2.changedDtsFiles.size).toBe(0);
  });
});
