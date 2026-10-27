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

/** Asserts that a record's keys are already in sorted order. */
function expectSortedKeys(record: Record<string, unknown>, context: string): void {
  const keys = Object.keys(record);
  expect(keys)
    .withContext(context)
    .toEqual([...keys].sort());
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
    it('generates only browser stats file with valid, sorted metafile data when true', async () => {
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
      expectSortedKeys(browserStats.inputs, 'inputs');
      expectSortedKeys(browserStats.outputs, 'outputs');
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
          'src/app/app.module.ts': `
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
        });
      });

      it('attributes a shared component stylesheet output to every input', async () => {
        harness.useTarget('build', {
          ...BASE_OPTIONS,
          statsJson: true,
        });

        const { result } = await harness.executeOnce();
        expect(result?.success).toBeTrue();

        // Both inputs are attributed to the single shared output, and in sorted order.
        const stats = JSON.parse(harness.readFile('dist/browser-stats.json'));
        expect(Object.keys(stats.outputs['shared.css'].inputs)).toEqual([
          'src/app/a/shared.css',
          'src/app/b/shared.css',
        ]);
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

        await harness.executeWithCases([
          async ({ result }) => {
            expect(result?.success).toBeTrue();
            const stats = JSON.parse(harness.readFile('dist/browser-stats.json'));
            expect(Object.values(stats.outputs)).toContain(
              jasmine.objectContaining({
                inputs: {
                  'src/app/a/shared.css': jasmine.anything(),
                  'src/app/b/shared.css': jasmine.anything(),
                },
              }),
            );

            await harness.writeFile('src/app/a/shared.css', 'p { color: blue; }');
          },
          async ({ result }) => {
            expect(result?.success).toBeTrue();
            const stats = JSON.parse(harness.readFile('dist/browser-stats.json'));
            expect(Object.values(stats.outputs)).toContain(
              jasmine.objectContaining({
                inputs: { 'src/app/a/shared.css': jasmine.anything() },
              }),
            );
            expect(Object.values(stats.outputs)).toContain(
              jasmine.objectContaining({
                inputs: { 'src/app/b/shared.css': jasmine.anything() },
              }),
            );

            await harness.writeFile('src/app/a/shared.css', 'p { color: red; }');
          },
          async ({ result }) => {
            expect(result?.success).toBeTrue();
            const stats = JSON.parse(harness.readFile('dist/browser-stats.json'));
            expect(Object.values(stats.outputs)).toContain(
              jasmine.objectContaining({
                inputs: {
                  'src/app/a/shared.css': jasmine.anything(),
                  'src/app/b/shared.css': jasmine.anything(),
                },
              }),
            );

            // The restore re-bundled only `a`, so `b` now merges first. A second change to `a`
            // checks that the merge left the cached `b` result untouched.
            await harness.writeFile('src/app/a/shared.css', 'p { color: green; }');
          },
          ({ result }) => {
            expect(result?.success).toBeTrue();
            const stats = JSON.parse(harness.readFile('dist/browser-stats.json'));
            // The inner `inputs` objects are matched exactly, not with `objectContaining`: if the
            // previous case had mutated the cached `b` result in place, `b` would read
            // `{ a, b }` here and this exact match would fail. This is the guard for the
            // clone-on-first-insert in the metafile merge, so it must stay an exact match.
            expect(Object.values(stats.outputs)).toContain(
              jasmine.objectContaining({
                inputs: { 'src/app/a/shared.css': jasmine.anything() },
              }),
            );
            expect(Object.values(stats.outputs)).toContain(
              jasmine.objectContaining({
                inputs: { 'src/app/b/shared.css': jasmine.anything() },
              }),
            );
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

      it('generates separated browser and server stats files with sorted keys for an SSR build', async () => {
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

        expectSortedKeys(browserStats.inputs, 'browser inputs');
        expectSortedKeys(browserStats.outputs, 'browser outputs');
        expectSortedKeys(serverStats.inputs, 'server inputs');
        expectSortedKeys(serverStats.outputs, 'server outputs');

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
