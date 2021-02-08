/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Architect, BuilderRun } from '@angular-devkit/architect';
import * as browserSync from 'browser-sync';
import * as https from 'https';
import { from, throwError, timer } from 'rxjs';
import { concatMap, debounceTime, mergeMap, retryWhen, take } from 'rxjs/operators';
import { createArchitect, host } from '../../testing/utils';
import { SSRDevServerBuilderOutput } from './index';

// todo check why it resolves to mjs
// [ERR_REQUIRE_ESM]: Must use import to load ES Module
const fetch = require('node-fetch/lib/index.js').default;

describe('Serve SSR Builder', () => {
  const target = { project: 'app', target: 'serve-ssr' };
  let architect: Architect;
  let runs: BuilderRun[] = [];
  const originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;

  beforeAll(() => jasmine.DEFAULT_TIMEOUT_INTERVAL = 80000);
  afterAll(() => jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout);

  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;
  });

  afterEach(async () => {
    await Promise.all(runs.map(r => r.stop()));
    browserSync.reset();
    await host.restore().toPromise();
    runs = [];
  });

  // todo: alan-agius4: Investigate why this tests passed locally but fails in CI.
  // this is currenty disabled but still useful locally
  // tslint:disable-next-line: ban
  xit('works', async () => {
    host.writeMultipleFiles({
      'src/app/app.component.ts': `
      import { Component, Optional, Inject } from '@angular/core';
      import { REQUEST } from '@nguniversal/express-engine/tokens';
      import { Request } from 'express';

      @Component({
        selector: 'app-root',
        template: '{{ headers | json }}',
      })
      export class AppComponent {
        headers: any;

        constructor(@Optional() @Inject(REQUEST) private request: Request) {
          this.headers = this.request.headers;
        }
      }
      `
    });

    const run = await architect.scheduleTarget(target);
    runs.push(run);
    const output = await run.result as SSRDevServerBuilderOutput;
    expect(output.success).toBe(true);
    expect(output.baseUrl).toBe('http://localhost:4200');

    const response = await from(fetch(output.baseUrl as string)).pipe(
      retryWhen(err => err.pipe(
        mergeMap((error, attempts) => {
          return attempts > 10 || error.code !== 'ECONNRESET'
            ? throwError(error)
            : timer(200);
        }),
      )),
    ).toPromise() as any;

    expect(await response.text()).toContain(`"x-forwarded-host": "localhost:4200"`);
  });

  it('works with port 0', async () => {
    const run = await architect.scheduleTarget(target, { port: 0 });
    runs.push(run);
    const output = await run.result as SSRDevServerBuilderOutput;
    expect(output.success).toBe(true);
    expect(output.baseUrl).not.toContain('4200');
  });

  it('works with SSL', async () => {
    const run = await architect.scheduleTarget(target, { ssl: true });
    runs.push(run);
    const output = await run.result as SSRDevServerBuilderOutput;
    expect(output.success).toBe(true);
    expect(output.baseUrl).toBe('https://localhost:4200');

    const response = await fetch('https://localhost:4200/index.html', {
      agent: new https.Agent({ rejectUnauthorized: false }),
    });

    expect(await response.text()).toContain('<title>App</title>');
  });

  // todo: alan-agius4: Investigate why this tests passed locally but fails in CI.
  // this is currenty disabled but still useful locally
  // tslint:disable-next-line: ban
  xit('works with rebuilds with fetch', async () => {
    const run = await architect.scheduleTarget(target, { port: 7001 });
    runs.push(run);

    await run.output
      .pipe(
        // Rebuild tests are especially sensitive to time between writes due to file watcher
        // behaviour. Give them a while.
        debounceTime(3000),
        concatMap(async (output, index) => {
          expect(output.baseUrl).toBe('http://localhost:7001');
          expect(output.success).toBe(true, `index: ${index}`);
          const response = await fetch(output.baseUrl as string);
          const text = await response.text();

          switch (index) {
            case 0:
              expect(text).toContain('app is running!');
              expect(text).not.toContain('hello world!');
              host.appendToFile('src/app/app.component.html', 'hello world!');
              break;
            case 1:
              expect(text).toContain('hello world!');
              break;
          }
        }),
        take(2),
      )
      .toPromise();
  });
});
