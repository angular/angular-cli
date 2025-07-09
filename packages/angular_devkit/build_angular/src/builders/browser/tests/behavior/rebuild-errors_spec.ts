/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { logging } from '@angular-devkit/core';
import { buildWebpackBrowser } from '../../index';
import { BASE_OPTIONS, BROWSER_BUILDER_INFO, describeBuilder } from '../setup';

describeBuilder(buildWebpackBrowser, BROWSER_BUILDER_INFO, (harness) => {
  describe('Behavior: "Rebuild Error"', () => {
    it('detects template errors with no AOT codegen or TS emit differences', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        aot: true,
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

      await harness.executeWithCases(
        [
          async ({ result }) => {
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
          },
          async ({ result, logs }) => {
            expect(result?.success).toBeFalse();
            expect(logs).toContain(
              jasmine.objectContaining<logging.LogEntry>({
                message: jasmine.stringMatching(typeErrorText),
              }),
            );

            // Make an unrelated change to verify error cache was updated
            // Should persist error in the next rebuild
            await harness.modifyFile('src/main.ts', (content) => content + '\n');
          },
          async ({ result, logs }) => {
            expect(result?.success).toBeFalse();
            expect(logs).toContain(
              jasmine.objectContaining<logging.LogEntry>({
                message: jasmine.stringMatching(typeErrorText),
              }),
            );

            // Revert the directive change that caused the error
            // Should remove the error
            await harness.writeFile('src/app/dir.ts', goodDirectiveContents);
          },
          async ({ result, logs }) => {
            expect(result?.success).toBeTrue();
            expect(logs).not.toContain(
              jasmine.objectContaining<logging.LogEntry>({
                message: jasmine.stringMatching(typeErrorText),
              }),
            );

            // Make an unrelated change to verify error cache was updated
            // Should continue showing no error
            await harness.modifyFile('src/main.ts', (content) => content + '\n');
          },
          ({ result, logs }) => {
            expect(result?.success).toBeTrue();
            expect(logs).not.toContain(
              jasmine.objectContaining<logging.LogEntry>({
                message: jasmine.stringMatching(typeErrorText),
              }),
            );
          },
        ],
        { outputLogsOnFailure: false },
      );
    });

    it('detects template errors with AOT codegen differences', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        aot: true,
        watch: true,
      });

      const typeErrorText = `Type 'number' is not assignable to type 'string'.`;

      // Create two directives and add to application
      await harness.writeFile(
        'src/app/dir.ts',
        `
        import { Directive, Input } from '@angular/core';
        @Directive({ selector: 'dir', standalone: false })
        export class Dir {
          @Input() foo: number;
        }
      `,
      );

      // Same selector with a different type on the `foo` property but initially no `@Input`
      const goodDirectiveContents = `
        import { Directive } from '@angular/core';
        @Directive({ selector: 'dir', standalone: false })
        export class Dir2 {
          foo: string;
        }
      `;
      await harness.writeFile('src/app/dir2.ts', goodDirectiveContents);

      await harness.writeFile(
        'src/app/app.module.ts',
        `
        import { NgModule } from '@angular/core';
        import { BrowserModule } from '@angular/platform-browser';
        import { AppComponent } from './app.component';
        import { Dir } from './dir';
        import { Dir2 } from './dir2';
        @NgModule({
          declarations: [
            AppComponent,
            Dir,
            Dir2,
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

      await harness.executeWithCases(
        [
          async ({ result }) => {
            expect(result?.success).toBeTrue();

            // Update second directive to use string property `foo` as an Input
            // Should cause a template error
            await harness.writeFile(
              'src/app/dir2.ts',
              `
                  import { Directive, Input } from '@angular/core';
                  @Directive({ selector: 'dir', standalone: false })
                  export class Dir2 {
                    @Input() foo: string;
                  }
                `,
            );
          },
          async ({ result, logs }) => {
            expect(result?.success).toBeFalse();
            expect(logs).toContain(
              jasmine.objectContaining<logging.LogEntry>({
                message: jasmine.stringMatching(typeErrorText),
              }),
            );

            // Make an unrelated change to verify error cache was updated
            // Should persist error in the next rebuild
            await harness.modifyFile('src/main.ts', (content) => content + '\n');
          },
          async ({ result, logs }) => {
            expect(result?.success).toBeFalse();
            expect(logs).toContain(
              jasmine.objectContaining<logging.LogEntry>({
                message: jasmine.stringMatching(typeErrorText),
              }),
            );

            // Revert the directive change that caused the error
            // Should remove the error
            await harness.writeFile('src/app/dir2.ts', goodDirectiveContents);
          },
          async ({ result, logs }) => {
            expect(result?.success).toBeTrue();
            expect(logs).not.toContain(
              jasmine.objectContaining<logging.LogEntry>({
                message: jasmine.stringMatching(typeErrorText),
              }),
            );

            // Make an unrelated change to verify error cache was updated
            // Should continue showing no error
            await harness.modifyFile('src/main.ts', (content) => content + '\n');
          },
          ({ result, logs }) => {
            expect(result?.success).toBeTrue();
            expect(logs).not.toContain(
              jasmine.objectContaining<logging.LogEntry>({
                message: jasmine.stringMatching(typeErrorText),
              }),
            );
          },
        ],
        { outputLogsOnFailure: false },
      );
    });

    it('recovers from component stylesheet error', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        watch: true,
        aot: false,
      });

      await harness.executeWithCases(
        [
          async ({ result }) => {
            expect(result?.success).toBeTrue();
            await harness.writeFile('src/app/app.component.css', 'invalid-css-content');
          },
          async ({ result, logs }) => {
            expect(result?.success).toBeFalse();
            expect(logs).toContain(
              jasmine.objectContaining<logging.LogEntry>({
                message: jasmine.stringMatching('invalid-css-content'),
              }),
            );

            await harness.writeFile('src/app/app.component.css', 'p { color: green }');
          },
          ({ result, logs }) => {
            expect(result?.success).toBeTrue();
            expect(logs).not.toContain(
              jasmine.objectContaining<logging.LogEntry>({
                message: jasmine.stringMatching('invalid-css-content'),
              }),
            );

            harness.expectFile('dist/main.js').content.toContain('p { color: green }');
          },
        ],
        { outputLogsOnFailure: false },
      );
    });
  });
});
