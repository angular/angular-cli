/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { runTargetSpec } from '@angular-devkit/architect/testing';
import { join, virtualFs } from '@angular-devkit/core';
import { tap } from 'rxjs/operators';
import { browserTargetSpec, host, outputPath } from '../utils';


describe('Browser Builder bundle worker', () => {
  beforeEach(done => host.initialize().toPromise().then(done, done.fail));
  // afterEach(done => host.restore().toPromise().then(done, done.fail));

  const workerFiles = {
    'src/dep.js': `export const foo = 'bar';`,
    'src/worker.js': `
      import { foo } from './dep';

      console.log('hello from worker');

      addEventListener('message', ({ data }) => {
        console.log('worker got message:', data);
        if (data === 'hello') {
          postMessage(foo);
        }
      });
    `,
    'src/main.ts': `
      const worker = new Worker('./worker', { type: 'module' });
      worker.onmessage = ({ data }) => {
        console.log('page got message:', data);
      };
      worker.postMessage('hello');
    `,
  };

  describe('js workers', () => {
    it('bundles worker', (done) => {
      host.writeMultipleFiles(workerFiles);
      const overrides = { autoBundleWorkerModules: true };
      runTargetSpec(host, browserTargetSpec, overrides).pipe(
        tap((buildEvent) => expect(buildEvent.success).toBe(true)),
        tap(() => {
          const workerContent = virtualFs.fileBufferToString(
            host.scopedSync().read(join(outputPath, '0.worker.js')),
          );
          // worker bundle contains worker code.
          expect(workerContent).toContain('hello from worker');
          expect(workerContent).toContain('bar');

          const mainContent = virtualFs.fileBufferToString(
            host.scopedSync().read(join(outputPath, 'main.js')),
          );
          // main bundle references worker.
          expect(mainContent).toContain('0.worker.js');
        }),
      ).toPromise().then(done, done.fail);
    });

    it('minimizes and hashes worker', (done) => {
      host.writeMultipleFiles(workerFiles);
      const overrides = { autoBundleWorkerModules: true, outputHashing: 'all', optimization: true };
      runTargetSpec(host, browserTargetSpec, overrides).pipe(
        tap((buildEvent) => expect(buildEvent.success).toBe(true)),
        tap(() => {
          const workerBundle = host.fileMatchExists(outputPath,
            /0\.[0-9a-f]{20}\.worker\.js/) as string;
          expect(workerBundle).toBeTruthy('workerBundle should exist');
          const workerContent = virtualFs.fileBufferToString(
            host.scopedSync().read(join(outputPath, workerBundle)),
          );
          expect(workerContent).toContain('hello from worker');
          expect(workerContent).toContain('bar');
          expect(workerContent).toContain('"hello"===e&&postMessage("bar")');

          const mainBundle = host.fileMatchExists(outputPath, /main\.[0-9a-f]{20}\.js/) as string;
          expect(mainBundle).toBeTruthy('mainBundle should exist');
          const mainContent = virtualFs.fileBufferToString(
            host.scopedSync().read(join(outputPath, mainBundle)),
          );
          expect(mainContent).toContain(workerBundle);
        }),
      ).toPromise().then(done, done.fail);
    });
  });
});
