/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { concatMap, count, take, timeout } from 'rxjs';
import { buildApplication } from '../../index';
import { APPLICATION_BUILDER_INFO, BASE_OPTIONS, describeBuilder } from '../setup';

/**
 * Maximum time in milliseconds for single build/rebuild
 * This accounts for CI variability.
 */
export const BUILD_TIMEOUT = 30_000;

describeBuilder(buildApplication, APPLICATION_BUILDER_INFO, (harness) => {
  describe('Behavior: "Rebuild updates in general cases"', () => {
    it('detects changes after a file was deleted and recreated', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        watch: true,
      });

      const fileAContent = `
        console.log('FILE-A');
        export {};
      `;

      // Create a file and add to application
      await harness.writeFile('src/app/file-a.ts', fileAContent);
      await harness.writeFile(
        'src/app/app.component.ts',
        `
        import { Component } from '@angular/core';
        import './file-a';
        @Component({
          selector: 'app-root',
          standalone: false,
          template: 'App component',
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
                harness.expectFile('dist/browser/main.js').content.toContain('FILE-A');

                // Delete the imported file
                await harness.removeFile('src/app/file-a.ts');

                break;
              case 1:
                // Should fail from missing import
                expect(result?.success).toBeFalse();

                // Remove the failing import
                await harness.modifyFile('src/app/app.component.ts', (content) =>
                  content.replace(`import './file-a';`, ''),
                );

                break;
              case 2:
                expect(result?.success).toBeTrue();

                harness.expectFile('dist/browser/main.js').content.not.toContain('FILE-A');

                // Recreate the file and the import
                await harness.writeFile('src/app/file-a.ts', fileAContent);
                await harness.modifyFile(
                  'src/app/app.component.ts',
                  (content) => `import './file-a';\n` + content,
                );

                break;
              case 3:
                expect(result?.success).toBeTrue();

                harness.expectFile('dist/browser/main.js').content.toContain('FILE-A');

                // Change the imported file
                await harness.modifyFile('src/app/file-a.ts', (content) =>
                  content.replace('FILE-A', 'FILE-B'),
                );

                break;
              case 4:
                expect(result?.success).toBeTrue();

                harness.expectFile('dist/browser/main.js').content.toContain('FILE-B');

                break;
            }
          }),
          take(5),
          count(),
        )
        .toPromise();

      expect(buildCount).toBe(5);
    });
  });
});
