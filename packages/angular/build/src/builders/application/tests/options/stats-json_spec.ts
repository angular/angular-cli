/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { buildApplication } from '../../index';
import { OutputHashing } from '../../schema';
import { APPLICATION_BUILDER_INFO, BASE_OPTIONS, describeBuilder } from '../setup';

/** Returns a copy of the value with object keys sorted at every level. Arrays keep their order. */
function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;

    return Object.fromEntries(
      Object.keys(record)
        .sort()
        .map((key) => [key, sortKeys(record[key])]),
    );
  }

  return value;
}

/** A standalone component in `src/app/<dir>` that uses the stylesheet `src/app/<dir>/shared.css`. */
function sharedStylesheetComponent(dir: string): string {
  return `
    import { Component } from '@angular/core';
    @Component({
      selector: 'app-shared-${dir}',
      template: '<p>${dir}</p>',
      styleUrl: './shared.css',
    })
    export class Shared${dir.toUpperCase()}Component {}
  `;
}

describeBuilder(buildApplication, APPLICATION_BUILDER_INFO, (harness) => {
  describe('Option: "statsJson"', () => {
    it('generates only browser stats file containing valid metafile data when true', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        statsJson: true,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      harness.expectFile('dist/browser-stats.json').toExist();
      harness.expectFile('dist/server-stats.json').toNotExist();

      const browserStats = JSON.parse(harness.readFile('dist/browser-stats.json'));
      expect(browserStats.inputs).toBeDefined();
      expect(browserStats.outputs).toBeDefined();
      expect(Object.keys(browserStats.outputs).length).toBeGreaterThan(0);
    });

    it('does not generate stats files when false', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        statsJson: false,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      harness.expectFile('dist/browser-stats.json').toNotExist();
      harness.expectFile('dist/server-stats.json').toNotExist();
    });

    it('does not generate stats files when not set', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      harness.expectFile('dist/browser-stats.json').toNotExist();
      harness.expectFile('dist/server-stats.json').toNotExist();
    });

    it('writes the stats file with sorted keys', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        statsJson: true,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      const text = harness.readFile('dist/browser-stats.json');
      expect(text).toEqual(JSON.stringify(sortKeys(JSON.parse(text)), null, 2));
    });

    describe('shared component stylesheet', () => {
      beforeEach(async () => {
        // Two components in different directories with byte-identical stylesheets of the same
        // file name bundle to the same output file.
        await harness.writeFiles({
          'src/app/a/shared.component.ts': sharedStylesheetComponent('a'),
          'src/app/a/shared.css': 'p { color: red; }',
          'src/app/b/shared.component.ts': sharedStylesheetComponent('b'),
          'src/app/b/shared.css': 'p { color: red; }',
          'src/app/app.component.html':
            '<app-shared-a></app-shared-a><app-shared-b></app-shared-b>',
        });
        await harness.writeFile(
          'src/app/app.module.ts',
          `
          import { NgModule } from '@angular/core';
          import { BrowserModule } from '@angular/platform-browser';
          import { AppComponent } from './app.component';
          import { SharedAComponent } from './a/shared.component';
          import { SharedBComponent } from './b/shared.component';
          @NgModule({
            declarations: [AppComponent],
            imports: [BrowserModule, SharedAComponent, SharedBComponent],
            bootstrap: [AppComponent],
          })
          export class AppModule {}
        `,
        );
      });

      it('attributes a shared component stylesheet output to every input on every build', async () => {
        harness.useTarget('build', {
          ...BASE_OPTIONS,
          statsJson: true,
        });

        for (let i = 0; i < 2; i++) {
          const { result } = await harness.executeOnce();
          expect(result?.success).toBeTrue();

          const stats = JSON.parse(harness.readFile('dist/browser-stats.json'));
          expect(Object.keys(stats.outputs['shared.css'].inputs)).toEqual([
            'src/app/a/shared.css',
            'src/app/b/shared.css',
          ]);
        }
      });

      it('re-attributes a shared component stylesheet output after one stylesheet changes', async () => {
        // Hashed output names keep the two stylesheets apart once their content differs, so the
        // outputs are found by their inputs. Minified styles carry no source path comment, which
        // gives the identical stylesheets the same hashed name.
        harness.useTarget('build', {
          ...BASE_OPTIONS,
          statsJson: true,
          optimization: { styles: true },
          outputHashing: OutputHashing.All,
          watch: true,
        });

        const inputsOfOutputFor = (stylesheet: string): string[][] => {
          const stats = JSON.parse(harness.readFile('dist/browser-stats.json'));

          return Object.values<{ inputs: Record<string, unknown> }>(stats.outputs)
            .map((output) => Object.keys(output.inputs))
            .filter((inputs) => inputs.includes(stylesheet));
        };

        await harness.executeWithCases([
          async ({ result }) => {
            expect(result?.success).toBeTrue();
            expect(inputsOfOutputFor('src/app/b/shared.css')).toEqual([
              ['src/app/a/shared.css', 'src/app/b/shared.css'],
            ]);

            await harness.writeFile('src/app/a/shared.css', 'p { color: blue; }');
          },
          async ({ result }) => {
            expect(result?.success).toBeTrue();
            expect(inputsOfOutputFor('src/app/b/shared.css')).toEqual([['src/app/b/shared.css']]);
            expect(inputsOfOutputFor('src/app/a/shared.css')).toEqual([['src/app/a/shared.css']]);

            await harness.writeFile('src/app/a/shared.css', 'p { color: red; }');
          },
          async ({ result }) => {
            expect(result?.success).toBeTrue();
            expect(inputsOfOutputFor('src/app/b/shared.css')).toEqual([
              ['src/app/a/shared.css', 'src/app/b/shared.css'],
            ]);

            // The restore re-bundled only `a`, so `b` now merges first. A second change to `a`
            // checks that the merge left the cached `b` result untouched.
            await harness.writeFile('src/app/a/shared.css', 'p { color: green; }');
          },
          async ({ result }) => {
            expect(result?.success).toBeTrue();
            expect(inputsOfOutputFor('src/app/b/shared.css')).toEqual([['src/app/b/shared.css']]);
            expect(inputsOfOutputFor('src/app/a/shared.css')).toEqual([['src/app/a/shared.css']]);

            await harness.writeFile('src/app/a/shared.css', 'p { color: red; }');
          },
          ({ result }) => {
            expect(result?.success).toBeTrue();
            expect(inputsOfOutputFor('src/app/b/shared.css')).toEqual([
              ['src/app/a/shared.css', 'src/app/b/shared.css'],
            ]);
          },
        ]);
      });
    });

    describe('server build', () => {
      beforeEach(async () => {
        await harness.modifyFile('src/tsconfig.app.json', (content) => {
          const tsConfig = JSON.parse(content);
          tsConfig.files ??= [];
          tsConfig.files.push('main.server.ts');

          return JSON.stringify(tsConfig);
        });
      });

      it('writes both stats files with sorted keys', async () => {
        harness.useTarget('build', {
          ...BASE_OPTIONS,
          server: 'src/main.server.ts',
          ssr: true,
          statsJson: true,
        });

        const { result } = await harness.executeOnce();
        expect(result?.success).toBeTrue();

        for (const file of ['dist/browser-stats.json', 'dist/server-stats.json']) {
          const text = harness.readFile(file);
          expect(text)
            .withContext(file)
            .toEqual(JSON.stringify(sortKeys(JSON.parse(text)), null, 2));
        }
      });

      it('generates separated browser and server stats files for an SSR build', async () => {
        harness.useTarget('build', {
          ...BASE_OPTIONS,
          server: 'src/main.server.ts',
          ssr: true,
          statsJson: true,
        });

        const { result } = await harness.executeOnce();
        expect(result?.success).toBeTrue();

        harness.expectFile('dist/browser-stats.json').toExist();
        harness.expectFile('dist/server-stats.json').toExist();

        const browserStats = JSON.parse(harness.readFile('dist/browser-stats.json'));
        const serverStats = JSON.parse(harness.readFile('dist/server-stats.json'));

        const browserPaths = new Set(Object.keys(browserStats.outputs));
        const serverPaths = new Set(Object.keys(serverStats.outputs));

        expect(serverPaths.size).toBeGreaterThan(0);
        expect(browserPaths.size).toBeGreaterThan(0);

        for (const path of serverPaths) {
          expect(browserPaths.has(path))
            .withContext(`Server output '${path}' should not appear in browser-stats.json`)
            .toBeFalse();
        }

        for (const path of browserPaths) {
          expect(serverPaths.has(path))
            .withContext(`Browser output '${path}' should not appear in server-stats.json`)
            .toBeFalse();
        }
      });
    });
  });
});
