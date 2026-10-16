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

    it('should emit all chunks referenced by a web worker when chunk optimization is enabled', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        optimization: true,
      });

      await harness.writeFile(
        'src/app/shared.ts',
        `export function sharedHelper(value: string) { return [value, value.toUpperCase(), value.toLowerCase(), value.repeat(3)].join('-'); }`,
      );
      await harness.writeFile(
        'src/app/lazy-a.ts',
        `import { sharedHelper } from './shared'; export const a = () => sharedHelper('a');`,
      );
      await harness.writeFile(
        'src/app/lazy-b.ts',
        `import { sharedHelper } from './shared'; export const b = () => sharedHelper('b');`,
      );
      await harness.writeFile('src/app/lazy-c.ts', `export const c = () => 'c';`);

      await harness.writeFile(
        'src/app/worker.ts',
        `
        addEventListener('message', async () => {
          const [{ a }, { b }] = await Promise.all([import('./lazy-a'), import('./lazy-b')]);
          postMessage(a() + b());
        });
      `,
      );

      await harness.writeFile(
        'src/app/app.component.ts',
        `
        import { Component } from '@angular/core';
        @Component({
          selector: 'app-root',
          standalone: false,
          template: '<h1>Worker Test</h1>',
        })
        export class AppComponent {
          worker = new Worker(new URL('./worker', import.meta.url), { type: 'module' });
          constructor() {
            Promise.all([import('./lazy-a'), import('./lazy-b'), import('./lazy-c')]).then(console.log);
          }
        }
      `,
      );

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      expect(harness.hasFileMatch('dist/browser', /^worker-chunk-/)).toBeTrue();

      const mainContent = harness.readFile('dist/browser/main.js');
      const workerMatch = mainContent.match(/(worker-[A-Z0-9]{8}\.js)/);
      expect(workerMatch).not.toBeNull();

      const filesToCheck = new Set(['main.js']);
      if (workerMatch) {
        filesToCheck.add(workerMatch[1]);
      }

      for (const file of filesToCheck) {
        expect(harness.hasFile(`dist/browser/${file}`))
          .withContext(`Expected dist/browser/${file} to exist`)
          .toBeTrue();

        const content = harness.readFile(`dist/browser/${file}`);
        for (const match of content.matchAll(/(?:from|import)\s*\(?["']\.\/([^"']+\.js)["']\)?/g)) {
          filesToCheck.add(match[1]);
        }
      }
    });
  });
});
