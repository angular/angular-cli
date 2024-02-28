/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { buildApplication } from '../../index';
import { APPLICATION_BUILDER_INFO, BASE_OPTIONS, describeBuilder } from '../setup';

describeBuilder(buildApplication, APPLICATION_BUILDER_INFO, (harness) => {
  describe('Option: "externalDependencies"', () => {
    it('should not externalize any dependency when option is not set', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      harness.expectFile('dist/browser/main.js').content.not.toMatch(/from ['"]@angular\/core['"]/);
      harness
        .expectFile('dist/browser/main.js')
        .content.not.toMatch(/from ['"]@angular\/common['"]/);
    });

    it('should only externalize the listed depedencies when option is set', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        externalDependencies: ['@angular/core'],
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      harness.expectFile('dist/browser/main.js').content.toMatch(/from ['"]@angular\/core['"]/);
      harness
        .expectFile('dist/browser/main.js')
        .content.not.toMatch(/from ['"]@angular\/common['"]/);
    });

    it('should externalize the listed depedencies in Web Workers when option is set', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        externalDependencies: ['path'],
      });

      // The `path` Node.js builtin is used to cause a failure if not externalized
      const workerCodeFile = `
        import path from "path";
        console.log(path);
      `;

      // Create a worker file
      await harness.writeFile('src/app/worker.ts', workerCodeFile);

      // Create app component that uses the directive
      await harness.writeFile(
        'src/app/app.component.ts',
        `
          import { Component } from '@angular/core'
          @Component({
            selector: 'app-root',
            template: '<h1>Worker Test</h1>',
          })
          export class AppComponent {
            worker = new Worker(new URL('./worker', import.meta.url), { type: 'module' });
          }
        `,
      );

      const { result } = await harness.executeOnce();
      // If not externalized, build will fail with a Node.js platform builtin error
      expect(result?.success).toBeTrue();
    });
  });
});
