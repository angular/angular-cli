/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import assert from 'node:assert/strict';
import { replaceInFile } from '../../utils/fs';
import { ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';
import { executeBrowserTest } from '../../utils/puppeteer';

export default async function () {
  // Add lazy route.
  await ng('generate', 'component', 'lazy');
  await replaceInFile(
    'src/app/app.routes.ts',
    'routes: Routes = [];',
    `routes: Routes = [{path: 'lazy', loadComponent: () => import('./lazy/lazy').then(c => c.Lazy)}];`,
  );

  const testCases = [
    {
      aot: false,
      csp: `trusted-types angular angular#unsafe-bypass angular#unsafe-jit angular#bundler; require-trusted-types-for 'script';`,
    },
    {
      aot: true,
      csp: `trusted-types angular angular#unsafe-bypass angular#bundler; require-trusted-types-for 'script';`,
    },
  ];

  for (const { aot, csp } of testCases) {
    await updateJsonFile('angular.json', (json) => {
      const architect = json['projects']['test-project']['architect'];
      architect['build']['options']['aot'] = aot;
      if (!architect['serve']['options']) architect['serve']['options'] = {};
      architect['serve']['options']['headers'] = {
        'Content-Security-Policy': csp,
      };
    });

    try {
      await executeBrowserTest({
        checkFn: async (page) => {
          const baseUrl = page.url();
          await page.goto(new URL('/lazy', baseUrl).href);

          await page.waitForSelector('app-lazy p');
          const lazyText = await page.$eval('app-lazy p', (el) => el.textContent);
          assert.strictEqual(lazyText, 'lazy works!');
        },
      });
    } catch (error) {
      console.error(`Test case AOT ${aot} with CSP header ${csp} failed.`);
      throw error;
    }
  }
}
