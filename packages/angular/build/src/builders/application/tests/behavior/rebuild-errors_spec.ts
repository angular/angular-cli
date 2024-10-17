/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { logging } from '@angular-devkit/core';
import { concatMap, count, take, timeout } from 'rxjs';
import { buildApplication } from '../../index';
import { APPLICATION_BUILDER_INFO, BASE_OPTIONS, describeBuilder } from '../setup';

/**
 * Maximum time in milliseconds for single build/rebuild
 * This accounts for CI variability.
 */
export const BUILD_TIMEOUT = 30_000;

describeBuilder(buildApplication, APPLICATION_BUILDER_INFO, (harness) => {
  describe('Behavior: "Rebuild Error Detection"', () => {
    it('detects template errors with no AOT codegen or TS emit differences', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        watch: true,
      });

      const goodDirectiveContents = `
        import { Directive, Input } from '@angular/core';
        @Directive({ selector: 'dir', standalone: false })
        export class Dir {
          @Input() foo: number;
        }
      `;

      const typeErrorText = `Type 'number' is not assignable to type 'string'.`;

      // Create a directive and add to application
      await harness.writeFile('src/app/dir.ts', goodDirectiveContents);
      await harness.writeFile(
        'src/app/app.module.ts',
        `
        import { NgModule } from '@angular/core';
        import { BrowserModule } from '@angular/platform-browser';
        import { AppComponent } from './app.component';
        import { Dir } from './dir';
        @NgModule({
          declarations: [
            AppComponent,
            Dir,
          ],
          imports: [
            BrowserModule
          ],
          providers: [],
          bootstrap: [AppComponent]
        })
        export class AppModule { }
      `,
      );

      // Create app component that uses the directive
      await harness.writeFile(
        'src/app/app.component.ts',
        `
        import { Component } from '@angular/core'
        @Component({
          selector: 'app-root',
          standalone: false,
          template: '<dir [foo]="123">',
        })
        export class AppComponent { }
      `,
      );

      const buildCount = await harness
        .execute({ outputLogsOnFailure: false })
        .pipe(
          timeout(BUILD_TIMEOUT),
          concatMap(async ({ result, logs }, index) => {
            switch (index) {
              case 0:
                expect(result?.success).toBeTrue();

                // Update directive to use a different input type for 'foo' (number -> string)
                // Should cause a template error
                await harness.writeFile(
                  'src/app/dir.ts',
                  `
                  import { Directive, Input } from '@angular/core';
                  @Directive({ selector: 'dir', standalone: false })
                  export class Dir {
                    @Input() foo: string;
                  }
                `,
                );

                break;
              case 1:
                expect(result?.success).toBeFalse();
                expect(logs).toContain(
                  jasmine.objectContaining<logging.LogEntry>({
                    message: jasmine.stringMatching(typeErrorText),
                  }),
                );

                // Make an unrelated change to verify error cache was updated
                // Should persist error in the next rebuild
                await harness.modifyFile('src/main.ts', (content) => content + '\n');

                break;
              case 2:
                expect(result?.success).toBeFalse();
                expect(logs).toContain(
                  jasmine.objectContaining<logging.LogEntry>({
                    message: jasmine.stringMatching(typeErrorText),
                  }),
                );

                // Revert the directive change that caused the error
                // Should remove the error
                await harness.writeFile('src/app/dir.ts', goodDirectiveContents);

                break;
              case 3:
                expect(result?.success).toBeTrue();
                expect(logs).not.toContain(
                  jasmine.objectContaining<logging.LogEntry>({
                    message: jasmine.stringMatching(typeErrorText),
                  }),
                );

                // Make an unrelated change to verify error cache was updated
                // Should continue showing no error
                await harness.modifyFile('src/main.ts', (content) => content + '\n');

                break;
              case 4:
                expect(result?.success).toBeTrue();
                expect(logs).not.toContain(
                  jasmine.objectContaining<logging.LogEntry>({
                    message: jasmine.stringMatching(typeErrorText),
                  }),
                );

                break;
            }
          }),
          take(5),
          count(),
        )
        .toPromise();

      expect(buildCount).toBe(5);
    });

    it('detects cumulative block syntax errors', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        watch: true,
      });

      const buildCount = await harness
        .execute({ outputLogsOnFailure: false })
        .pipe(
          timeout(BUILD_TIMEOUT),
          concatMap(async ({ logs }, index) => {
            switch (index) {
              case 0:
                // Add invalid block syntax
                await harness.appendToFile('src/app/app.component.html', '@one');

                break;
              case 1:
                expect(logs).toContain(
                  jasmine.objectContaining<logging.LogEntry>({
                    message: jasmine.stringContaining('@one'),
                  }),
                );

                // Make an unrelated change to verify error cache was updated
                // Should persist error in the next rebuild
                await harness.modifyFile('src/main.ts', (content) => content + '\n');

                break;
              case 2:
                expect(logs).toContain(
                  jasmine.objectContaining<logging.LogEntry>({
                    message: jasmine.stringContaining('@one'),
                  }),
                );

                // Add more invalid block syntax
                await harness.appendToFile('src/app/app.component.html', '@two');

                break;
              case 3:
                expect(logs).toContain(
                  jasmine.objectContaining<logging.LogEntry>({
                    message: jasmine.stringContaining('@one'),
                  }),
                );
                expect(logs).toContain(
                  jasmine.objectContaining<logging.LogEntry>({
                    message: jasmine.stringContaining('@two'),
                  }),
                );

                // Add more invalid block syntax
                await harness.appendToFile('src/app/app.component.html', '@three');

                break;
              case 4:
                expect(logs).toContain(
                  jasmine.objectContaining<logging.LogEntry>({
                    message: jasmine.stringContaining('@one'),
                  }),
                );
                expect(logs).toContain(
                  jasmine.objectContaining<logging.LogEntry>({
                    message: jasmine.stringContaining('@two'),
                  }),
                );
                expect(logs).toContain(
                  jasmine.objectContaining<logging.LogEntry>({
                    message: jasmine.stringContaining('@three'),
                  }),
                );

                // Revert the changes that caused the error
                // Should remove the error
                await harness.writeFile('src/app/app.component.html', '<p>GOOD</p>');

                break;
              case 5:
                expect(logs).not.toContain(
                  jasmine.objectContaining<logging.LogEntry>({
                    message: jasmine.stringContaining('@one'),
                  }),
                );
                expect(logs).not.toContain(
                  jasmine.objectContaining<logging.LogEntry>({
                    message: jasmine.stringContaining('@two'),
                  }),
                );
                expect(logs).not.toContain(
                  jasmine.objectContaining<logging.LogEntry>({
                    message: jasmine.stringContaining('@three'),
                  }),
                );

                break;
            }
          }),
          take(6),
          count(),
        )
        .toPromise();

      expect(buildCount).toBe(6);
    });

    it('recovers from component stylesheet error', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        watch: true,
        aot: false,
      });

      const buildCount = await harness
        .execute({ outputLogsOnFailure: false })
        .pipe(
          timeout(BUILD_TIMEOUT),
          concatMap(async ({ result, logs }, index) => {
            switch (index) {
              case 0:
                await harness.writeFile('src/app/app.component.css', 'invalid-css-content');

                break;
              case 1:
                expect(logs).toContain(
                  jasmine.objectContaining<logging.LogEntry>({
                    message: jasmine.stringMatching('invalid-css-content'),
                  }),
                );

                await harness.writeFile('src/app/app.component.css', 'p { color: green }');

                break;
              case 2:
                expect(logs).not.toContain(
                  jasmine.objectContaining<logging.LogEntry>({
                    message: jasmine.stringMatching('invalid-css-content'),
                  }),
                );

                harness
                  .expectFile('dist/browser/main.js')
                  .content.toContain('p {\\n  color: green;\\n}');

                break;
            }
          }),
          take(3),
          count(),
        )
        .toPromise();

      expect(buildCount).toBe(3);
    });

    it('recovers from component template error', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        watch: true,
      });

      const buildCount = await harness
        .execute({ outputLogsOnFailure: false })
        .pipe(
          timeout(BUILD_TIMEOUT),
          concatMap(async ({ result, logs }, index) => {
            switch (index) {
              case 0:
                // Missing ending `>` on the div will cause an error
                await harness.appendToFile('src/app/app.component.html', '<div>Hello, world!</div');

                break;
              case 1:
                expect(logs).toContain(
                  jasmine.objectContaining<logging.LogEntry>({
                    message: jasmine.stringMatching('Unexpected character "EOF"'),
                  }),
                );

                await harness.appendToFile('src/app/app.component.html', '>');

                break;
              case 2:
                expect(logs).not.toContain(
                  jasmine.objectContaining<logging.LogEntry>({
                    message: jasmine.stringMatching('Unexpected character "EOF"'),
                  }),
                );

                harness.expectFile('dist/browser/main.js').content.toContain('Hello, world!');

                // Make an additional valid change to ensure that rebuilds still trigger
                await harness.appendToFile('src/app/app.component.html', '<div>Guten Tag</div>');

                break;
              case 3:
                expect(logs).not.toContain(
                  jasmine.objectContaining<logging.LogEntry>({
                    message: jasmine.stringMatching('invalid-css-content'),
                  }),
                );

                harness.expectFile('dist/browser/main.js').content.toContain('Hello, world!');
                harness.expectFile('dist/browser/main.js').content.toContain('Guten Tag');

                break;
            }
          }),
          take(4),
          count(),
        )
        .toPromise();

      expect(buildCount).toBe(4);
    });
  });
});
