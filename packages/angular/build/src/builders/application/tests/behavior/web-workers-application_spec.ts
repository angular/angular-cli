/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { buildApplication } from '../../index';
import { APPLICATION_BUILDER_INFO, BASE_OPTIONS, describeBuilder } from '../setup';

/**
 * A regular expression used to check if a built worker is correctly referenced in application code.
 */
const REFERENCED_WORKER_REGEXP =
  /new Worker\(new URL\("worker-[A-Z0-9]{8}\.js", import\.meta\.url\)/;

describeBuilder(buildApplication, APPLICATION_BUILDER_INFO, (harness) => {
  describe('Behavior: "Bundles web worker files within application code"', () => {
    it('should use the worker entry point when worker lazy chunks are present', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      const workerCodeFile = `
        addEventListener('message', () => {
          import('./extra').then((m) => console.log(m.default));
        });
      `;
      const extraWorkerCodeFile = `
        export default 'WORKER FILE';
      `;

      // Create a worker file
      await harness.writeFile('src/app/worker.ts', workerCodeFile);
      await harness.writeFile('src/app/extra.ts', extraWorkerCodeFile);

      // Create app component that uses the directive
      await harness.writeFile(
        'src/app/app.component.ts',
        `
        import { Component } from '@angular/core'
        @Component({
          selector: 'app-root',
          standalone: false,
          template: '<h1>Worker Test</h1>',
        })
        export class AppComponent {
          worker = new Worker(new URL('./worker', import.meta.url), { type: 'module' });
        }
      `,
      );

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      // Ensure built worker is referenced in the application code
      harness.expectFile('dist/browser/main.js').content.toMatch(REFERENCED_WORKER_REGEXP);
    });
  });
});
