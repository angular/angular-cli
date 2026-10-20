/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { NormalizedEntryPoint, NormalizedLibraryOptions } from '../types';
import { bundleEntryPoints } from './bundler';

describe('bundler pipeline', () => {
  const workspaceRoot = '/workspace';
  const projectRoot = '/workspace/projects/my-lib';
  const outputPath = '/workspace/dist/my-lib';

  function createEntryPoint(
    name = '.',
    bundleName = 'my-lib',
    entryFilePath = `${projectRoot}/src/public-api.ts`,
  ): NormalizedEntryPoint {
    return {
      subpath: name === '.' ? '.' : `./${name}`,
      name,
      displayName: name === '.' ? 'my-lib' : `my-lib/${name}`,
      bundleName,
      entryFilePath,
      isPrimary: name === '.',
    };
  }

  function createOptions(
    entryPoints: readonly NormalizedEntryPoint[],
    overrides: Partial<NormalizedLibraryOptions> = {},
  ): NormalizedLibraryOptions {
    return {
      workspaceRoot,
      projectRoot,
      outputPath,
      preserveSymlinks: false,
      declarationMap: false,
      entryPoints: new Map(entryPoints.map((ep) => [ep.name, ep])),
      ...overrides,
    } as unknown as NormalizedLibraryOptions;
  }

  describe('memory-file-loader resolution', () => {
    it('should resolve relative directory imports with trailing slashes', async () => {
      const primary = createEntryPoint();
      const options = createOptions([primary]);

      const esmFiles = new Map<string, string>([
        [
          `${projectRoot}/src/public-api.js`,
          `export * from './dir/';
export * from './nested///';`,
        ],
        [`${projectRoot}/src/dir/index.js`, `export const DIR_VALUE = 'from-dir';`],
        [`${projectRoot}/src/nested/index.mjs`, `export const NESTED_VALUE = 'from-nested';`],
      ]);

      const dtsFiles = new Map<string, string>([
        [
          `${projectRoot}/src/public-api.d.ts`,
          `export * from './dir/';
export * from './nested///';`,
        ],
        [`${projectRoot}/src/dir/index.d.ts`, `export declare const DIR_VALUE: string;`],
        [`${projectRoot}/src/nested/index.d.mts`, `export declare const NESTED_VALUE: string;`],
      ]);

      const output = await bundleEntryPoints(
        [{ entryPoint: primary, hasEsmChanges: true, hasDtsChanges: true }],
        esmFiles,
        dtsFiles,
        options,
      );

      expect(output.warnings).toEqual([]);
      expect(output.filesToEmit).toContain(
        jasmine.objectContaining({
          path: 'fesm2022/my-lib.mjs',
          contents: jasmine.stringContaining('from-dir'),
        }),
      );
      expect(output.filesToEmit).toContain(
        jasmine.objectContaining({
          path: 'fesm2022/my-lib.mjs',
          contents: jasmine.stringContaining('from-nested'),
        }),
      );
      expect(output.filesToEmit).toContain(
        jasmine.objectContaining({
          path: 'types/my-lib.d.ts',
          contents: jasmine.stringContaining('DIR_VALUE'),
        }),
      );
      expect(output.filesToEmit).toContain(
        jasmine.objectContaining({
          path: 'types/my-lib.d.ts',
          contents: jasmine.stringContaining('NESTED_VALUE'),
        }),
      );
    });

    it('should prefer .d.mts for .mjs specifiers in d.ts mode', async () => {
      const primary = createEntryPoint();
      const options = createOptions([primary]);

      const esmFiles = new Map<string, string>([
        [`${projectRoot}/src/public-api.js`, `export * from './mod-esm.mjs';`],
        [`${projectRoot}/src/mod-esm.mjs`, `export const FROM_MJS = 1;`],
      ]);

      const dtsFiles = new Map<string, string>([
        [`${projectRoot}/src/public-api.d.ts`, `export * from './mod-esm.mjs';`],
        // Both .d.ts and .d.mts exist; .mjs specifier should pick .d.mts
        [`${projectRoot}/src/mod-esm.d.ts`, `export declare const WRONG_ESM: number;`],
        [`${projectRoot}/src/mod-esm.d.mts`, `export declare const FROM_MJS: number;`],
      ]);

      const output = await bundleEntryPoints(
        [{ entryPoint: primary, hasEsmChanges: true, hasDtsChanges: true }],
        esmFiles,
        dtsFiles,
        options,
      );

      expect(output.warnings).toEqual([]);
      expect(output.filesToEmit).toContain(
        jasmine.objectContaining({
          path: 'types/my-lib.d.ts',
          contents: jasmine.stringContaining('FROM_MJS'),
        }),
      );
      expect(output.filesToEmit).not.toContain(
        jasmine.objectContaining({
          path: 'types/my-lib.d.ts',
          contents: jasmine.stringContaining('WRONG_ESM'),
        }),
      );
    });
  });

  describe('watch mode shared chunk consistency', () => {
    it('should preserve shared chunks across entry points during a partial watch rebuild', async () => {
      const primary = createEntryPoint('.', 'my-lib', `${projectRoot}/src/public-api.ts`);
      const secondary = createEntryPoint(
        'secondary',
        'my-lib-secondary',
        `${projectRoot}/secondary/src/public-api.ts`,
      );
      const options = createOptions([primary, secondary]);

      const esmFiles = new Map<string, string>([
        [`${projectRoot}/src/shared.js`, `export const SHARED_TOKEN = 'shared-v1';`],
        [
          `${projectRoot}/src/public-api.js`,
          `import { SHARED_TOKEN } from './shared';
export const PRIMARY = 'primary-' + SHARED_TOKEN;`,
        ],
        [
          `${projectRoot}/secondary/src/public-api.js`,
          `import { SHARED_TOKEN } from '../../src/shared';
export const SECONDARY = 'secondary-' + SHARED_TOKEN;`,
        ],
      ]);

      const dtsFiles = new Map<string, string>([
        [`${projectRoot}/src/shared.d.ts`, `export interface SharedItem { id: string; }`],
        [
          `${projectRoot}/src/public-api.d.ts`,
          `import type { SharedItem } from './shared';
export declare const PRIMARY: SharedItem;`,
        ],
        [
          `${projectRoot}/secondary/src/public-api.d.ts`,
          `import type { SharedItem } from '../../src/shared';
export declare const SECONDARY: SharedItem;`,
        ],
      ]);

      // 1. Initial full build with both entry points
      const initialOutput = await bundleEntryPoints(
        [
          { entryPoint: primary, hasEsmChanges: true, hasDtsChanges: true },
          { entryPoint: secondary, hasEsmChanges: true, hasDtsChanges: true },
        ],
        esmFiles,
        dtsFiles,
        options,
      );

      expect(initialOutput.filesToEmit).toContain(
        jasmine.objectContaining({
          path: jasmine.stringMatching(/^fesm2022\/shared-[^/]+\.mjs$/),
        }),
      );
      expect(initialOutput.filesToEmit).toContain(
        jasmine.objectContaining({
          path: jasmine.stringMatching(/^types\/shared-[^/]+\.d\.ts$/),
        }),
      );

      // 2. Partial watch rebuild where only the primary entry point has changes
      esmFiles.set(
        `${projectRoot}/src/public-api.js`,
        `import { SHARED_TOKEN } from './shared';
export const PRIMARY = 'primary-updated-' + SHARED_TOKEN;`,
      );
      dtsFiles.set(
        `${projectRoot}/src/public-api.d.ts`,
        `import type { SharedItem } from './shared';
export declare const PRIMARY: SharedItem;
export declare const EXTRA: boolean;`,
      );

      const rebuildOutput = await bundleEntryPoints(
        [
          {
            entryPoint: primary,
            hasEsmChanges: true,
            hasDtsChanges: true,
            previousBundleResult: initialOutput.bundleResults.get('.'),
          },
        ],
        esmFiles,
        dtsFiles,
        options,
        initialOutput.bundleResults,
      );

      expect(rebuildOutput.filesToEmit).toContain(
        jasmine.objectContaining({
          path: jasmine.stringMatching(/^fesm2022\/shared-[^/]+\.mjs$/),
        }),
      );
      expect(rebuildOutput.filesToEmit).toContain(
        jasmine.objectContaining({
          path: jasmine.stringMatching(/^types\/shared-[^/]+\.d\.ts$/),
        }),
      );
      expect(rebuildOutput.filesToEmit).toContain(
        jasmine.objectContaining({
          path: 'fesm2022/my-lib.mjs',
          contents: jasmine.stringContaining('primary-updated-'),
        }),
      );
      expect(rebuildOutput.filesToEmit).not.toContain(
        jasmine.objectContaining({
          path: 'fesm2022/my-lib.mjs',
          contents: jasmine.stringContaining('shared-v1'),
        }),
      );
      expect(rebuildOutput.filesToEmit).toContain(
        jasmine.objectContaining({
          path: 'fesm2022/my-lib-secondary.mjs',
        }),
      );
      expect(rebuildOutput.filesToEmit).not.toContain(
        jasmine.objectContaining({
          path: 'fesm2022/my-lib-secondary.mjs',
          contents: jasmine.stringContaining('shared-v1'),
        }),
      );

      expect(rebuildOutput.bundleResults.get('.')?.esmOutputFiles).toContain(
        jasmine.stringMatching(/^fesm2022\/shared-[^/]+\.mjs$/),
      );
      expect(rebuildOutput.bundleResults.get('secondary')?.esmOutputFiles).toContain(
        jasmine.stringMatching(/^fesm2022\/shared-[^/]+\.mjs$/),
      );
      expect(rebuildOutput.bundleResults.get('.')?.dtsOutputFiles).toContain(
        jasmine.stringMatching(/^types\/shared-[^/]+\.d\.ts$/),
      );
      expect(rebuildOutput.bundleResults.get('secondary')?.dtsOutputFiles).toContain(
        jasmine.stringMatching(/^types\/shared-[^/]+\.d\.ts$/),
      );
    });

    it('should update non-dirty entry point esmOutputFiles while preserving dtsOutputFiles during an ESM-only watch rebuild', async () => {
      const primary = createEntryPoint('.', 'my-lib', `${projectRoot}/src/public-api.ts`);
      const secondary = createEntryPoint(
        'secondary',
        'my-lib-secondary',
        `${projectRoot}/secondary/src/public-api.ts`,
      );
      const options = createOptions([primary, secondary]);

      const esmFiles = new Map<string, string>([
        [`${projectRoot}/src/shared.js`, `export const SHARED_TOKEN = 'shared-v1';`],
        [
          `${projectRoot}/src/public-api.js`,
          `import { SHARED_TOKEN } from './shared';
export const PRIMARY = 'primary-' + SHARED_TOKEN;`,
        ],
        [
          `${projectRoot}/secondary/src/public-api.js`,
          `import { SHARED_TOKEN } from '../../src/shared';
export const SECONDARY = 'secondary-' + SHARED_TOKEN;`,
        ],
      ]);

      const dtsFiles = new Map<string, string>([
        [`${projectRoot}/src/shared.d.ts`, `export interface SharedItem { id: string; }`],
        [
          `${projectRoot}/src/public-api.d.ts`,
          `import type { SharedItem } from './shared';
export declare const PRIMARY: SharedItem;`,
        ],
        [
          `${projectRoot}/secondary/src/public-api.d.ts`,
          `import type { SharedItem } from '../../src/shared';
export declare const SECONDARY: SharedItem;`,
        ],
      ]);

      const initialOutput = await bundleEntryPoints(
        [
          { entryPoint: primary, hasEsmChanges: true, hasDtsChanges: true },
          { entryPoint: secondary, hasEsmChanges: true, hasDtsChanges: true },
        ],
        esmFiles,
        dtsFiles,
        options,
      );

      const initialSecondaryResult = initialOutput.bundleResults.get('secondary');
      expect(initialSecondaryResult).toBeDefined();

      // ESM-only modification on primary entry point (no .d.ts change)
      esmFiles.set(
        `${projectRoot}/src/public-api.js`,
        `import { SHARED_TOKEN } from './shared';
export const PRIMARY = 'primary-esm-only-' + SHARED_TOKEN;`,
      );

      const rebuildOutput = await bundleEntryPoints(
        [
          {
            entryPoint: primary,
            hasEsmChanges: true,
            hasDtsChanges: false,
            previousBundleResult: initialOutput.bundleResults.get('.'),
          },
        ],
        esmFiles,
        dtsFiles,
        options,
        initialOutput.bundleResults,
      );

      const updatedSecondaryResult = rebuildOutput.bundleResults.get('secondary');
      expect(updatedSecondaryResult).toBeDefined();
      expect(updatedSecondaryResult?.esmOutputFiles).toContain('fesm2022/my-lib-secondary.mjs');
      expect(updatedSecondaryResult?.esmOutputFiles).toContain(
        jasmine.stringMatching(/^fesm2022\/shared-[^/]+\.mjs$/),
      );
      expect(updatedSecondaryResult?.dtsOutputFiles).toEqual(
        initialSecondaryResult?.dtsOutputFiles,
      );
      expect(updatedSecondaryResult?.dtsModuleIds).toEqual(initialSecondaryResult?.dtsModuleIds);
    });

    it('should extract a shared chunk when a dirty entry point newly imports an existing module', async () => {
      const primary = createEntryPoint('.', 'my-lib', `${projectRoot}/src/public-api.ts`);
      const secondary = createEntryPoint(
        'secondary',
        'my-lib-secondary',
        `${projectRoot}/secondary/src/public-api.ts`,
      );
      const options = createOptions([primary, secondary]);

      const esmFiles = new Map<string, string>([
        [`${projectRoot}/src/shared.js`, `export const SHARED_TOKEN = 'shared-v1';`],
        [
          `${projectRoot}/src/public-api.js`,
          `import { SHARED_TOKEN } from './shared';
export const PRIMARY = 'primary-' + SHARED_TOKEN;`,
        ],
        [
          `${projectRoot}/secondary/src/public-api.js`,
          `export const SECONDARY = 'secondary-only';`,
        ],
      ]);

      const dtsFiles = new Map<string, string>([
        [`${projectRoot}/src/shared.d.ts`, `export interface SharedItem { id: string; }`],
        [
          `${projectRoot}/src/public-api.d.ts`,
          `import type { SharedItem } from './shared';
export declare const PRIMARY: SharedItem;`,
        ],
        [`${projectRoot}/secondary/src/public-api.d.ts`, `export declare const SECONDARY: string;`],
      ]);

      // 1. Initial build: only primary imports shared, so shared is inlined into primary and no shared chunk exists
      const initialOutput = await bundleEntryPoints(
        [
          { entryPoint: primary, hasEsmChanges: true, hasDtsChanges: true },
          { entryPoint: secondary, hasEsmChanges: true, hasDtsChanges: true },
        ],
        esmFiles,
        dtsFiles,
        options,
      );

      expect(initialOutput.filesToEmit).not.toContain(
        jasmine.objectContaining({
          path: jasmine.stringMatching(/^fesm2022\/shared-[^/]+\.mjs$/),
        }),
      );
      expect(initialOutput.filesToEmit).toContain(
        jasmine.objectContaining({
          path: 'fesm2022/my-lib.mjs',
          contents: jasmine.stringContaining('shared-v1'),
        }),
      );

      // 2. Watch rebuild: secondary is modified to also import shared; only secondary is dirty
      esmFiles.set(
        `${projectRoot}/secondary/src/public-api.js`,
        `import { SHARED_TOKEN } from '../../src/shared';
export const SECONDARY = 'secondary-' + SHARED_TOKEN;`,
      );
      dtsFiles.set(
        `${projectRoot}/secondary/src/public-api.d.ts`,
        `import type { SharedItem } from '../../src/shared';
export declare const SECONDARY: SharedItem;`,
      );

      const rebuildOutput = await bundleEntryPoints(
        [
          {
            entryPoint: secondary,
            hasEsmChanges: true,
            hasDtsChanges: true,
            previousBundleResult: initialOutput.bundleResults.get('secondary'),
          },
        ],
        esmFiles,
        dtsFiles,
        options,
        initialOutput.bundleResults,
      );

      expect(rebuildOutput.filesToEmit).toContain(
        jasmine.objectContaining({
          path: jasmine.stringMatching(/^fesm2022\/shared-[^/]+\.mjs$/),
        }),
      );
      expect(rebuildOutput.filesToEmit).toContain(
        jasmine.objectContaining({
          path: jasmine.stringMatching(/^types\/shared-[^/]+\.d\.ts$/),
        }),
      );
      expect(rebuildOutput.filesToEmit).toContain(
        jasmine.objectContaining({
          path: 'fesm2022/my-lib.mjs',
        }),
      );
      expect(rebuildOutput.filesToEmit).not.toContain(
        jasmine.objectContaining({
          path: 'fesm2022/my-lib.mjs',
          contents: jasmine.stringContaining('shared-v1'),
        }),
      );
      expect(rebuildOutput.filesToEmit).not.toContain(
        jasmine.objectContaining({
          path: 'fesm2022/my-lib-secondary.mjs',
          contents: jasmine.stringContaining('shared-v1'),
        }),
      );
      expect(rebuildOutput.bundleResults.get('.')?.esmOutputFiles).toContain(
        jasmine.stringMatching(/^fesm2022\/shared-[^/]+\.mjs$/),
      );
      expect(rebuildOutput.bundleResults.get('secondary')?.esmOutputFiles).toContain(
        jasmine.stringMatching(/^fesm2022\/shared-[^/]+\.mjs$/),
      );
      expect(rebuildOutput.bundleResults.get('.')?.dtsOutputFiles).toContain(
        jasmine.stringMatching(/^types\/shared-[^/]+\.d\.ts$/),
      );
      expect(rebuildOutput.bundleResults.get('secondary')?.dtsOutputFiles).toContain(
        jasmine.stringMatching(/^types\/shared-[^/]+\.d\.ts$/),
      );
    });
  });
});
