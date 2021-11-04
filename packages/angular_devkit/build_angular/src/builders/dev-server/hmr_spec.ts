/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Architect, BuilderRun } from '@angular-devkit/architect';
/* eslint-disable import/no-extraneous-dependencies */
import { Browser } from 'puppeteer/lib/cjs/puppeteer/common/Browser';
import { Page } from 'puppeteer/lib/cjs/puppeteer/common/Page';
import puppeteer from 'puppeteer/lib/cjs/puppeteer/node';
/* eslint-enable import/no-extraneous-dependencies */
import { debounceTime, switchMap, take } from 'rxjs/operators';
import { createArchitect, host } from '../../testing/test-utils';

/* eslint-disable @typescript-eslint/no-explicit-any */
declare const document: any;
declare const getComputedStyle: any;
/* eslint-enable @typescript-eslint/no-explicit-any */

describe('Dev Server Builder HMR', () => {
  const target = { project: 'app', target: 'serve' };
  const overrides = { hmr: true, watch: true, port: 0 };
  let architect: Architect;
  let browser: Browser;
  let page: Page;
  let logs: string[] = [];
  let runs: BuilderRun[];

  beforeAll(async () => {
    browser = await puppeteer.launch({
      // MacOSX users need to set the local binary manually because Chrome has lib files with
      // spaces in them which Bazel does not support in runfiles
      // See: https://github.com/angular/angular-cli/pull/17624
      // eslint-disable-next-line max-len
      // executablePath: '/Users/<USERNAME>/git/angular-cli/node_modules/puppeteer/.local-chromium/mac-800071/chrome-mac/Chromium.app/Contents/MacOS/Chromium',
      args: ['--no-sandbox', '--disable-gpu'],
    });
  });

  afterAll(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;

    logs = [];
    runs = [];
    page = await browser.newPage();
    page.on('console', (msg) => logs.push(msg.text()));

    host.writeMultipleFiles({
      'src/app/app.component.html': `
        <p>{{title}}</p>

        <input class="visible" type="text">
        <input type="file">
        <input type="hidden">

        <select>
          <option>one</option>
          <option>two</option>
        </select>
      `,
    });
  });

  afterEach(async () => {
    await host.restore().toPromise();
    await page.close();
    await Promise.all(runs.map((r) => r.stop()));
  });

  it('works for CSS changes', async () => {
    const run = await architect.scheduleTarget(target, overrides);
    runs.push(run);

    let buildCount = 0;
    await run.output
      .pipe(
        debounceTime(1000),
        switchMap(async (buildEvent) => {
          expect(buildEvent.success).toBe(true);
          const url = buildEvent.baseUrl as string;
          switch (buildCount) {
            case 0:
              await page.goto(url);
              expect(logs).toContain('[HMR] Waiting for update signal from WDS...');
              host.writeMultipleFiles({
                'src/styles.css': 'p { color: rgb(255, 255, 0) }',
              });
              break;
            case 1:
              expect(logs).toContain('[HMR] Updated modules:');
              expect(logs).toContain(`[HMR] css reload %s ${url}styles.css`);
              expect(logs).toContain('[HMR] App is up to date.');

              const pTagColor = await page.evaluate(() => {
                const el = document.querySelector('p');

                return getComputedStyle(el).color;
              });

              expect(pTagColor).toBe('rgb(255, 255, 0)');
              break;
          }

          logs = [];
          buildCount++;
        }),
        take(2),
      )
      .toPromise();
  });

  it('works for TS changes', async () => {
    const run = await architect.scheduleTarget(target, overrides);
    runs.push(run);

    let buildCount = 0;
    await run.output
      .pipe(
        debounceTime(1000),
        switchMap(async (buildEvent) => {
          expect(buildEvent.success).toBe(true);
          const url = buildEvent.baseUrl as string;

          switch (buildCount) {
            case 0:
              await page.goto(url);
              expect(logs).toContain('[HMR] Waiting for update signal from WDS...');
              host.replaceInFile('src/app/app.component.ts', `'app'`, `'app-hmr'`);
              break;
            case 1:
              expect(logs).toContain('[HMR] Updated modules:');
              expect(logs).toContain('[HMR] App is up to date.');

              const innerText = await page.evaluate(() => document.querySelector('p').innerText);
              expect(innerText).toBe('app-hmr');
              break;
          }

          logs = [];
          buildCount++;
        }),
        take(2),
      )
      .toPromise();
  });

  it('restores input and select values', async () => {
    const run = await architect.scheduleTarget(target, overrides);
    runs.push(run);

    let buildCount = 0;
    await run.output
      .pipe(
        debounceTime(1000),
        switchMap(async (buildEvent) => {
          expect(buildEvent.success).toBe(true);
          const url = buildEvent.baseUrl as string;
          switch (buildCount) {
            case 0:
              await page.goto(url);
              expect(logs).toContain('[HMR] Waiting for update signal from WDS...');
              await page.evaluate(() => {
                document.querySelector('input.visible').value = 'input value';
                document.querySelector('select').value = 'two';
              });

              host.replaceInFile('src/app/app.component.ts', `'app'`, `'app-hmr'`);
              break;
            case 1:
              expect(logs).toContain('[HMR] Updated modules:');
              expect(logs).toContain('[HMR] App is up to date.');
              expect(logs).toContain('[NG HMR] Restoring input/textarea values.');
              expect(logs).toContain('[NG HMR] Restoring selected options.');

              const inputValue = await page.evaluate(
                () => document.querySelector('input.visible').value,
              );
              expect(inputValue).toBe('input value');

              const selectValue = await page.evaluate(() => document.querySelector('select').value);
              expect(selectValue).toBe('two');
              break;
          }

          logs = [];
          buildCount++;
        }),
        take(2),
      )
      .toPromise();
  });
});
