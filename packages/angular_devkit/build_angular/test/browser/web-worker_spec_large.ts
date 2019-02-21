/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { DefaultTimeout, TestLogger, runTargetSpec } from '@angular-devkit/architect/testing';
import { join, virtualFs } from '@angular-devkit/core';
import { debounceTime, takeWhile, tap } from 'rxjs/operators';
import { browserTargetSpec, host, outputPath } from '../utils';


describe('Browser Builder Web Worker support', () => {
  beforeEach(done => host.initialize().toPromise().then(done, done.fail));
  afterEach(done => host.restore().toPromise().then(done, done.fail));

  const workerFiles: { [k: string]: string } = {
    'src/app/dep.ts': `export const foo = 'bar';`,
    'src/app/app.worker.ts': `
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
      import { enableProdMode } from '@angular/core';
      import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
      import { AppModule } from './app/app.module';
      import { environment } from './environments/environment';
      if (environment.production) { enableProdMode(); }
      platformBrowserDynamic().bootstrapModule(AppModule).catch(err => console.error(err));

      const worker = new Worker('./app/app.worker', { type: 'module' });
      worker.onmessage = ({ data }) => {
        console.log('page got message:', data);
      };
      worker.postMessage('hello');
    `,
    // Make a new tsconfig for the *.worker.ts files.
    // The final place for this tsconfig must take into consideration editor tooling, unit
    // tests, and integration with other build targets.
    './src/tsconfig.worker.json': `
      {
        "extends": "../tsconfig.json",
        "compilerOptions": {
          "outDir": "../out-tsc/worker",
          "lib": [
            "es2018",
            "webworker"
          ],
          "types": []
        },
        "include": [
          "**/*.worker.ts",
        ]
      }`,
    // Alter the app tsconfig to not include *.worker.ts files.
    './src/tsconfig.app.json': `
      {
        "extends": "../tsconfig.json",
        "compilerOptions": {
          "outDir": "../out-tsc/worker",
          "types": []
        },
        "exclude": [
          "test.ts",
          "**/*.spec.ts",
          "**/*.worker.ts",
          "app/dep.ts",
        ]
      }`,
  };

  it('bundles TS worker', (done) => {
    const logger = new TestLogger('worker-warnings');
    host.writeMultipleFiles(workerFiles);
    const overrides = { webWorkerTsConfig: 'src/tsconfig.worker.json' };
    runTargetSpec(host, browserTargetSpec, overrides, DefaultTimeout, logger).pipe(
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
      // Doesn't show any warnings.
      tap(() => expect(logger.includes('WARNING')).toBe(false, 'Should show no warnings.')),
    ).toPromise().then(done, done.fail);
  });

  it('minimizes and hashes worker', (done) => {
    host.writeMultipleFiles(workerFiles);
    const overrides = {
      webWorkerTsConfig: 'src/tsconfig.worker.json',
      outputHashing: 'all',
      optimization: true,
    };
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
        expect(workerContent).toContain('"hello"===t&&postMessage');

        const mainBundle = host.fileMatchExists(outputPath, /main\.[0-9a-f]{20}\.js/) as string;
        expect(mainBundle).toBeTruthy('mainBundle should exist');
        const mainContent = virtualFs.fileBufferToString(
          host.scopedSync().read(join(outputPath, mainBundle)),
        );
        expect(mainContent).toContain(workerBundle);
      }),
    ).toPromise().then(done, done.fail);
  });

  it('rebuilds TS worker', (done) => {
    host.writeMultipleFiles(workerFiles);
    const overrides = {
      webWorkerTsConfig: 'src/tsconfig.worker.json',
      watch: true,
    };

    let buildCount = 0;
    let phase = 1;
    const workerPath = join(outputPath, '0.worker.js');
    let workerContent = '';

    runTargetSpec(host, browserTargetSpec, overrides, DefaultTimeout * 3).pipe(
      // Wait for files to be written to disk.
      debounceTime(1000),
      tap((buildEvent) => expect(buildEvent.success).toBe(true, 'build should succeed')),
      tap(() => {
        buildCount++;
        switch (phase) {
          case 1:
            // Original worker content should be there.
            workerContent = virtualFs.fileBufferToString(host.scopedSync().read(workerPath));
            expect(workerContent).toContain('bar');
            // Change content of worker dependency.
            host.writeMultipleFiles({ 'src/app/dep.ts': `export const foo = 'baz';` });
            phase = 2;
            break;

          case 2:
            workerContent = virtualFs.fileBufferToString(host.scopedSync().read(workerPath));
            // TODO(filipesilva): Should this change? Check with Jason Miller.
            // The worker changes name with each rebuild. But sometimes it also changes from 0 to
            // 1 and then back to 0. It's hard to know where the updated content is, but it should
            // be in one of these two.
            const anotherWorkerPath = join(outputPath, '1.worker.js');
            const anotherWorkerContent = virtualFs.fileBufferToString(
              host.scopedSync().read(anotherWorkerPath));
            // Worker content should have changed.
            expect(
              workerContent.includes('baz') || anotherWorkerContent.includes('baz'),
            ).toBeTruthy('Worker bundle did not contain updated content.');
            phase = 3;
            break;
        }
      }),
      takeWhile(() => phase < 3),
    ).toPromise().then(
      () => done(),
      () => done.fail(`stuck at phase ${phase} [builds: ${buildCount}]`),
    );
  });
});
