/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { join } from 'node:path';
import { executeLibraryBuilder } from '../../builder';
import { BASE_OPTIONS, LIBRARY_BUILDER_INFO, describeLibraryBuilder } from '../setup';

describeLibraryBuilder(executeLibraryBuilder, LIBRARY_BUILDER_INFO, (harness) => {
  describe('Behavior: "Library Build"', () => {
    it('should build a library with FESM2022 and DTS bundles', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      const { result } = await harness.executeOnce();
      expect(result?.error).toBeUndefined();
      expect(result?.success).toBeTrue();

      harness.expectFile('dist/lib/fesm2022/lib.mjs').toExist();
      const fesmContent = harness.readFile('dist/lib/fesm2022/lib.mjs');
      expect(fesmContent).toContain('LibComponent');
      expect(fesmContent).toContain('ɵcmp');

      harness.expectFile('dist/lib/fesm2022/lib.mjs.map').toExist();
      const fesmMap = JSON.parse(harness.readFile('dist/lib/fesm2022/lib.mjs.map'));
      expect(fesmMap.sources).toContain('../../../projects/lib/src/lib/lib.component.ts');
      harness.expectFile(join('dist/lib/fesm2022', fesmMap.sources[0])).toExist();

      harness.expectFile('dist/lib/types/lib.d.ts').toExist();
      const dtsContent = harness.readFile('dist/lib/types/lib.d.ts');
      expect(dtsContent).toContain('LibComponent');

      harness.expectFile('dist/lib/package.json').toExist();
      const pkgJson = JSON.parse(harness.readFile('dist/lib/package.json'));
      expect(pkgJson.dependencies).toBeUndefined();
      expect(pkgJson).toEqual(
        jasmine.objectContaining({
          name: 'lib',
          type: 'module',
          module: './fesm2022/lib.mjs',
          typings: './types/lib.d.ts',
          exports: jasmine.objectContaining({
            '.': {
              types: './types/lib.d.ts',
              default: './fesm2022/lib.mjs',
            },
          }),
        }),
      );
    });

    it('should log Rolldown bundler warnings', async () => {
      await harness.writeFile(
        'projects/lib/src/public-api.ts',
        `export function runDynamic(code: string) { return eval(code); }`,
      );

      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      const { result, logs } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      expect(logs).toContain(
        jasmine.objectContaining({
          level: 'warn',
          message: jasmine.stringContaining('eval'),
        }),
      );
    });

    it('should not log EMPTY_BUNDLE warnings for type-only entry points', async () => {
      await harness.modifyFile('projects/lib/tsconfig.lib.json', (content) => {
        const tsconfig = JSON.parse(content);
        tsconfig.compilerOptions.target = 'ES2022';

        return JSON.stringify(tsconfig, null, 2);
      });
      await harness.writeFile(
        'projects/lib/src/public-api.ts',
        `export interface OnlyType { id: string; }`,
      );

      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      const { result, logs } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      expect(logs).not.toContain(jasmine.objectContaining({ level: 'warn' }));
    });

    it('should preserve JSDoc comments in .d.ts and annotation comments in .mjs bundles', async () => {
      await harness.writeFile(
        'projects/lib/src/public-api.ts',
        `
        function identity<T>(x: T): T { return x; }
        /** Public API JSDoc comment */
        export const VALUE = /* @__PURE__ */ identity('test');
        `,
      );

      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      const fesmContent = harness.readFile('dist/lib/fesm2022/lib.mjs');
      expect(fesmContent).toContain('@__PURE__');
      expect(fesmContent).not.toContain('Public API JSDoc comment');

      const dtsContent = harness.readFile('dist/lib/types/lib.d.ts');
      expect(dtsContent).toContain('Public API JSDoc comment');
      expect(dtsContent).not.toContain('@__PURE__');
    });

    it('should automatically add tslib to dependencies when output chunks import tslib', async () => {
      await harness.writeFile(
        'projects/lib/src/public-api.ts',
        `
        function CustomClassDecorator(): ClassDecorator {
          return () => {};
        }

        @CustomClassDecorator()
        export class DecoratedService {}
        `,
      );

      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      const { result } = await harness.executeOnce();
      expect(result?.error).toBeUndefined();
      expect(result?.success).toBeTrue();

      const fesmContent = harness.readFile('dist/lib/fesm2022/lib.mjs');
      expect(fesmContent).toContain('tslib');

      const pkgJson = JSON.parse(harness.readFile('dist/lib/package.json'));
      expect(pkgJson.dependencies).toEqual({
        tslib: jasmine.any(String),
      });
    });

    it('should preserve existing user tslib version in package.json when output chunks import tslib', async () => {
      await harness.writeFile(
        'projects/lib/src/public-api.ts',
        `
        function CustomClassDecorator(): ClassDecorator {
          return () => {};
        }

        @CustomClassDecorator()
        export class DecoratedService {}
        `,
      );

      await harness.modifyFile('projects/lib/package.json', (content) => {
        const pkg = JSON.parse(content);
        pkg.dependencies = {
          tslib: '^2.0.0',
        };

        return JSON.stringify(pkg, null, 2);
      });

      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      const { result } = await harness.executeOnce();
      expect(result?.error).toBeUndefined();
      expect(result?.success).toBeTrue();

      const pkgJson = JSON.parse(harness.readFile('dist/lib/package.json'));
      expect(pkgJson.dependencies).toEqual({
        tslib: '^2.0.0',
      });
    });

    it('should log completion and output location', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      const { result, logs } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      expect(logs).toContain(
        jasmine.objectContaining({
          level: 'info',
          message: jasmine.stringMatching(
            /Library bundle generation complete\. \[\d+\.\d{3} seconds\] - \d{4}-\d{2}-\d{2}T/,
          ),
        }),
      );
      expect(logs).toContain(
        jasmine.objectContaining({
          level: 'info',
          message: jasmine.stringMatching(/Output location: .*dist[/\\]lib/),
        }),
      );
    });

    it('should log failure on build error without secondary bundler warnings', async () => {
      await harness.writeFile(
        'projects/lib/src/public-api.ts',
        `
        export const title: number = 'invalid type';
        export function runDynamic(code: string) { return eval(code); }
        `,
      );

      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      const { result, logs } = await harness.executeOnce({ outputLogsOnFailure: false });
      expect(result?.success).toBeFalse();
      expect(logs).toContain(
        jasmine.objectContaining({
          level: 'error',
          message: jasmine.stringContaining('TS2322'),
        }),
      );
      expect(logs).toContain(
        jasmine.objectContaining({
          level: 'error',
          message: jasmine.stringMatching(
            /Library bundle generation failed\. \[\d+\.\d{3} seconds\] - \d{4}-\d{2}-\d{2}T/,
          ),
        }),
      );
      expect(logs).not.toContain(jasmine.objectContaining({ level: 'warn' }));
      expect(logs).not.toContain(
        jasmine.objectContaining({
          message: jasmine.stringMatching(/Output location:/),
        }),
      );
    });

    it('should write and reuse .tsbuildinfo in the persistent cache directory when cache is enabled', async () => {
      harness.useProject('lib', {
        root: 'projects/lib',
        sourceRoot: 'projects/lib/src',
        cli: {
          cache: {
            enabled: true,
            environment: 'all',
            path: '.angular/cache',
          },
        },
      });

      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      const firstBuild = await harness.executeOnce();
      expect(firstBuild.result?.success).toBeTrue();
      harness
        .expectFile('.angular/cache/0.0.0-PLACEHOLDER/lib/angular-build-library/.tsbuildinfo')
        .toExist();

      await harness.writeFile(
        'projects/lib/src/public-api.ts',
        `
          export * from './lib/lib.service';
          export * from './lib/lib.component';
          export const CACHED_BUILD = true;
        `,
      );

      const secondBuild = await harness.executeOnce();
      expect(secondBuild.result?.success).toBeTrue();
      const fesmContent = harness.readFile('dist/lib/fesm2022/lib.mjs');
      expect(fesmContent).toContain('LibComponent');
      expect(fesmContent).toContain('CACHED_BUILD');
      const dtsContent = harness.readFile('dist/lib/types/lib.d.ts');
      expect(dtsContent).toContain('LibComponent');
      expect(dtsContent).toContain('CACHED_BUILD');
    });

    it('should report TypeScript declaration emit diagnostics', async () => {
      await harness.writeFiles({
        'projects/lib/src/lib/internal.ts': `
          interface PrivateData {
            value: number;
          }

          export const internalData: PrivateData = { value: 42 };
        `,
        'projects/lib/src/lib/feature.ts': `
          import { internalData } from './internal';

          export const data = internalData;
        `,
        'projects/lib/src/public-api.ts': `
          export * from './lib/feature';
          export * from './lib/lib.service';
          export * from './lib/lib.component';
        `,
      });

      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      const { result, logs } = await harness.executeOnce({ outputLogsOnFailure: false });
      expect(result?.success).toBeFalse();
      expect(logs).toContain(
        jasmine.objectContaining({
          level: 'error',
          message: jasmine.stringMatching(/TS4023:.*PrivateData/),
        }),
      );
      expect(logs).not.toContain(
        jasmine.objectContaining({
          message: jasmine.stringContaining('UNRESOLVED_IMPORT'),
        }),
      );
    });
  });
});
