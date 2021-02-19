/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Architect } from '@angular-devkit/architect';
import { join, logging, virtualFs } from '@angular-devkit/core';
import { timer } from 'rxjs';
import { debounceTime, map, switchMap, takeWhile, tap } from 'rxjs/operators';
import { browserBuild, createArchitect, host, outputPath } from '../../test-utils';


describe('Browser Builder Web Worker support', () => {
  const target = { project: 'app', target: 'build' };
  let architect: Architect;

  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;
  });
  afterEach(async () => host.restore().toPromise());

  const workerFiles: { [k: string]: string } = {
    'src/app/dep.ts': `export const foo = 'bar';`,
    'src/app/app.worker.ts': `
      /// <reference lib="webworker" />

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

      const worker = new Worker(new URL('./app/app.worker', import.meta.url), { type: 'module' });
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
        "files": [
          "main.ts",
          "polyfills.ts"
        ]
      }`,
  };

  it('bundles TS worker', async () => {
    host.writeMultipleFiles(workerFiles);

    const logger = new logging.Logger('');
    const logs: string[] = [];
    logger.subscribe(e => logs.push(e.message));

    const overrides = { webWorkerTsConfig: 'src/tsconfig.worker.json' };
    await browserBuild(architect, host, target, overrides, { logger });

    // Worker bundle contains worker code.
    const workerContent = virtualFs.fileBufferToString(
      host.scopedSync().read(join(outputPath, 'src_app_app_worker_ts.js')));
    expect(workerContent).toContain('hello from worker');
    expect(workerContent).toContain('bar');

    // Main bundle references worker.
    const mainContent = virtualFs.fileBufferToString(
      host.scopedSync().read(join(outputPath, 'main.js')));
    expect(mainContent).toContain('src_app_app_worker_ts');
    expect(logs.join().includes('Warning')).toBe(false, 'Should show no warnings.');
  });

  it('minimizes and hashes worker', async () => {
    host.writeMultipleFiles(workerFiles);
    const overrides = {
      webWorkerTsConfig: 'src/tsconfig.worker.json',
      outputHashing: 'all',
      optimization: true,
    };
    await browserBuild(architect, host, target, overrides);

    // Worker bundle should have hash and minified code.
    const workerBundle = host.fileMatchExists(outputPath, /src_app_app_worker_ts\.[0-9a-f]{20}\.js/) as string;
    expect(workerBundle).toBeTruthy('workerBundle should exist');
    const workerContent = virtualFs.fileBufferToString(
      host.scopedSync().read(join(outputPath, workerBundle)));
    expect(workerContent).toContain('hello from worker');
    expect(workerContent).toContain('bar');
    expect(workerContent).toContain('"hello"===e&&postMessage');

    // Main bundle should reference hashed worker bundle.
    const mainBundle = host.fileMatchExists(outputPath, /main\.[0-9a-f]{20}\.js/) as string;
    expect(mainBundle).toBeTruthy('mainBundle should exist');
    const mainContent = virtualFs.fileBufferToString(
      host.scopedSync().read(join(outputPath, mainBundle)));
    expect(mainContent).toContain('src_app_app_worker_ts');
  });

  it('rebuilds TS worker', async () => {
    host.writeMultipleFiles(workerFiles);
    const overrides = {
      webWorkerTsConfig: 'src/tsconfig.worker.json',
      watch: true,
    };

    let phase = 1;
    const workerPath = join(outputPath, 'src_app_app_worker_ts.js');
    let workerContent = '';

    // The current linux-based CI environments may not fully settled in regards to filesystem
    // changes from previous tests which reuse the same directory and fileset.
    // The initial delay helps mitigate false positive rebuild triggers in such scenarios.
    const { run } = await timer(1000).pipe(
      switchMap(() => architect.scheduleTarget(target, overrides)),
      switchMap(run => run.output.pipe(map(output => ({ run, output })))),
      debounceTime(1000),
      tap(({ output }) => expect(output.success).toBe(true, 'build should succeed')),
      tap(() => {
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
            // Worker content should have changed.
            expect(workerContent).toContain('baz');
            phase = 3;
            break;
        }
      }),
      takeWhile(() => phase < 3),
    ).toPromise();
    await run.stop();
  });
});
