/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { executeLibraryBuilder } from '../../builder';
import { BASE_OPTIONS, LIBRARY_BUILDER_INFO, describeLibraryBuilder } from '../setup';

describeLibraryBuilder(executeLibraryBuilder, LIBRARY_BUILDER_INFO, (harness) => {
  describe('Behavior: "Watch Mode Rebuilding"', () => {
    it('should rebuild library when a component file is modified', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        watch: true,
      });

      await harness.executeWithCases([
        async ({ result }) => {
          expect(result?.success).toBeTrue();
          const content = harness.readFile('dist/lib/fesm2022/lib.mjs');
          expect(content).toContain('LibComponent');

          // Trigger a change
          await harness.writeFile(
            'projects/lib/src/lib/lib.component.ts',
            `
            import { Component } from '@angular/core';

            @Component({
              selector: 'lib-rebuilt',
              template: '<span>Rebuilt</span>',
            })
            export class LibComponent {}
            `,
          );
        },
        async ({ result }) => {
          expect(result?.success).toBeTrue();
          const content = harness.readFile('dist/lib/fesm2022/lib.mjs');
          expect(content).toContain('lib-rebuilt');
        },
      ]);
    });

    it('should rebuild when external template or stylesheet file is modified', async () => {
      await harness.writeFiles({
        'projects/lib/src/lib/lib.component.html': '<h1>Initial Template</h1>',
        'projects/lib/src/lib/lib.component.css': 'h1 { color: blue; }',
        'projects/lib/src/lib/lib.component.ts': `
        import { Component } from '@angular/core';

        @Component({
          selector: 'lib-resources',
          templateUrl: './lib.component.html',
          styleUrl: './lib.component.css',
        })
        export class LibComponent {}
        `,
      });

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        watch: true,
      });

      await harness.executeWithCases([
        async ({ result }) => {
          expect(result?.success).toBeTrue();
          const content = harness.readFile('dist/lib/fesm2022/lib.mjs');
          expect(content).toContain('Initial Template');
          expect(content).toMatch(/color:\s*(?:blue|#00f)/);

          // Trigger change to external template
          await harness.writeFile(
            'projects/lib/src/lib/lib.component.html',
            '<h1>Updated Template</h1>',
          );
        },
        async ({ result }) => {
          expect(result?.success).toBeTrue();
          const content = harness.readFile('dist/lib/fesm2022/lib.mjs');
          expect(content).toContain('Updated Template');

          // Trigger change to external stylesheet
          await harness.writeFile('projects/lib/src/lib/lib.component.css', 'h1 { color: green; }');
        },
        async ({ result }) => {
          expect(result?.success).toBeTrue();
          const content = harness.readFile('dist/lib/fesm2022/lib.mjs');
          expect(content).toMatch(/color:\s*green/);
        },
      ]);
    });

    it('should rebuild intra-dependent secondary entry points when upstream changes', async () => {
      await harness.writeFiles({
        'projects/lib/shared/src/public-api.ts': `
        export const SHARED_VERSION = '1.0.0';
        `,
        'projects/lib/feature/src/public-api.ts': `
        import { SHARED_VERSION } from 'lib/shared';
        export const FEATURE_INFO = \`Feature using \${SHARED_VERSION}\`;
        `,
      });

      await harness.modifyFile('projects/lib/package.json', (content) => {
        const pkg = JSON.parse(content);
        pkg.exports = {
          '.': './src/public-api.ts',
          './shared': './shared/src/public-api.ts',
          './feature': './feature/src/public-api.ts',
        };

        return JSON.stringify(pkg, null, 2);
      });

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        watch: true,
      });

      await harness.executeWithCases([
        async ({ result }) => {
          expect(result?.success).toBeTrue();
          const featureFesm = harness.readFile('dist/lib/fesm2022/lib-feature.mjs');
          expect(featureFesm).toContain('FEATURE_INFO');

          // Modify upstream shared entry point
          await harness.writeFile(
            'projects/lib/shared/src/public-api.ts',
            `
            export const SHARED_VERSION = '2.0.0';
            `,
          );
        },
        async ({ result }) => {
          expect(result?.success).toBeTrue();
          const sharedFesm = harness.readFile('dist/lib/fesm2022/lib-shared.mjs');
          expect(sharedFesm).toContain('2.0.0');
          const featureFesm = harness.readFile('dist/lib/fesm2022/lib-feature.mjs');
          expect(featureFesm).toContain('FEATURE_INFO');
        },
      ]);
    });

    it('should re-copy assets when an asset file is modified in watch mode', async () => {
      await harness.writeFile('projects/lib/assets/data.json', '{"version": 1}');

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        assets: [
          {
            glob: '**/*',
            input: 'projects/lib/assets',
            output: 'assets',
          },
        ],
        watch: true,
      });

      await harness.executeWithCases([
        async ({ result }) => {
          expect(result?.success).toBeTrue();
          expect(harness.readFile('dist/lib/assets/data.json')).toBe('{"version": 1}');

          // Modify asset file
          await harness.writeFile('projects/lib/assets/data.json', '{"version": 2}');
        },
        async ({ result }) => {
          expect(result?.success).toBeTrue();
          expect(harness.readFile('dist/lib/assets/data.json')).toBe('{"version": 2}');
        },
      ]);
    });

    it('should set a watch version in package.json in watch mode', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        watch: true,
      });

      await harness.executeWithCases([
        async ({ result }) => {
          expect(result?.success).toBeTrue();
          const pkg = JSON.parse(harness.readFile('dist/lib/package.json'));
          expect(pkg.version).toMatch(/^0\.0\.0-watch\+\d+$/);
        },
      ]);
    });

    it('should not update package.json when only source files change in watch mode', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        watch: true,
      });

      let initialVersion: string;
      await harness.executeWithCases([
        async ({ result }) => {
          expect(result?.success).toBeTrue();
          const pkg = JSON.parse(harness.readFile('dist/lib/package.json'));
          initialVersion = pkg.version;
          expect(initialVersion).toMatch(/^0\.0\.0-watch\+\d+$/);

          // Wait a brief moment so Date.now() would differ if regenerated
          await new Promise((resolve) => setTimeout(resolve, 50));

          // Modify source file
          await harness.writeFile(
            'projects/lib/src/lib/lib.component.ts',
            `
            import { Component } from '@angular/core';

            @Component({
              selector: 'lib-rebuilt',
              template: '<span>Rebuilt</span>',
            })
            export class LibComponent {}
            `,
          );
        },
        async ({ result }) => {
          expect(result?.success).toBeTrue();
          const content = harness.readFile('dist/lib/fesm2022/lib.mjs');
          expect(content).toContain('lib-rebuilt');
          const pkg = JSON.parse(harness.readFile('dist/lib/package.json'));
          expect(pkg.version).toBe(initialVersion);
        },
      ]);
    });

    it('should update package.json when package.json is modified in watch mode', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        watch: true,
      });

      await harness.executeWithCases([
        async ({ result }) => {
          expect(result?.success).toBeTrue();
          const pkg = JSON.parse(harness.readFile('dist/lib/package.json'));
          expect(pkg.description).toBeUndefined();

          // Modify package.json
          const originalPkg = JSON.parse(harness.readFile('projects/lib/package.json'));
          originalPkg.description = 'Updated description';
          await harness.writeFile(
            'projects/lib/package.json',
            JSON.stringify(originalPkg, null, 2),
          );
        },
        async ({ result }) => {
          expect(result?.success).toBeTrue();
          const pkg = JSON.parse(harness.readFile('dist/lib/package.json'));
          expect(pkg.description).toBe('Updated description');
        },
      ]);
    });

    it('should recover from compilation errors in watch mode', async () => {
      await harness.writeFile(
        'projects/lib/src/public-api.ts',
        `export const title = 'hello world';`,
      );

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        watch: true,
      });

      await harness.executeWithCases([
        async ({ result }) => {
          expect(result?.success).toBeTrue();
          expect(harness.readFile('dist/lib/fesm2022/lib.mjs')).toContain('hello world');

          // Introduce a compilation error
          await harness.writeFile(
            'projects/lib/src/public-api.ts',
            `export const title: number = 'invalid type';`,
          );
        },
        async ({ result }) => {
          expect(result?.success).toBeFalse();

          // Fix the compilation error
          await harness.writeFile(
            'projects/lib/src/public-api.ts',
            `export const title = 'fixed world';`,
          );
        },
        async ({ result }) => {
          expect(result?.success).toBeTrue();
          expect(harness.readFile('dist/lib/fesm2022/lib.mjs')).toContain('fixed world');
        },
      ]);
    });

    it('should rebuild secondary entry point when its file changes', async () => {
      await harness.writeFiles({
        'projects/lib/secondary/src/public-api.ts': `export const MSG = 'initial secondary';`,
      });

      await harness.modifyFile('projects/lib/package.json', (content) => {
        const pkg = JSON.parse(content);
        pkg.exports = {
          '.': './src/public-api.ts',
          './secondary': './secondary/src/public-api.ts',
        };

        return JSON.stringify(pkg, null, 2);
      });

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        watch: true,
      });

      await harness.executeWithCases([
        async ({ result }) => {
          expect(result?.success).toBeTrue();
          expect(harness.readFile('dist/lib/fesm2022/lib-secondary.mjs')).toContain(
            'initial secondary',
          );

          // Modify secondary entry point source
          await harness.writeFile(
            'projects/lib/secondary/src/public-api.ts',
            `export const MSG = 'updated secondary';`,
          );
        },
        async ({ result, logs }) => {
          expect(result?.success).toBeTrue();
          expect(harness.readFile('dist/lib/fesm2022/lib-secondary.mjs')).toContain(
            'updated secondary',
          );
          const messages = logs.map((l) => l.message);
          expect(messages.some((m) => m.includes('Compiling lib/secondary...'))).toBeTrue();
          expect(messages.some((m) => m.includes('Compiling lib...'))).toBeFalse();
        },
      ]);
    });
    it('should recover when initial build fails with a compilation error', async () => {
      await harness.writeFile(
        'projects/lib/src/public-api.ts',
        `export const title: number = 'invalid type';`,
      );

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        watch: true,
      });

      await harness.executeWithCases([
        async ({ result }) => {
          expect(result?.success).toBeFalse();

          // Fix the compilation error
          await harness.writeFile(
            'projects/lib/src/public-api.ts',
            `export const title = 'fixed world';`,
          );
        },
        async ({ result }) => {
          expect(result?.success).toBeTrue();
          expect(harness.readFile('dist/lib/fesm2022/lib.mjs')).toContain('fixed world');
        },
      ]);
    });

    it('should rebuild when a new file is created in projectRoot', async () => {
      await harness.writeFile('projects/lib/src/public-api.ts', `export * from './extra';`);
      await harness.writeFile('projects/lib/src/extra.ts', `export const INITIAL = true;`);

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        watch: true,
      });

      await harness.executeWithCases([
        async ({ result }) => {
          expect(result?.success).toBeTrue();
          expect(harness.readFile('dist/lib/fesm2022/lib.mjs')).toContain('INITIAL');

          // Create a brand new file
          await harness.writeFile(
            'projects/lib/src/lib/new-feature.ts',
            `export const NEW_VAL = 123;`,
          );
          await harness.writeFile(
            'projects/lib/src/public-api.ts',
            `export * from './extra';\nexport * from './lib/new-feature';`,
          );
        },
        async ({ result }) => {
          expect(result?.success).toBeTrue();
          expect(harness.readFile('dist/lib/fesm2022/lib.mjs')).toContain('NEW_VAL');
        },
      ]);
    });
  });
});
