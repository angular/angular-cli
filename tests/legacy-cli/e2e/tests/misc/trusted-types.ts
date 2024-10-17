/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { replaceInFile, writeFile } from '../../utils/fs';
import { ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';

export default async function () {
  // Add lazy route.
  await ng('generate', 'component', 'lazy');
  await replaceInFile(
    'src/app/app.routes.ts',
    'routes: Routes = [];',
    `routes: Routes = [{path: 'lazy', loadComponent: () => import('./lazy/lazy.component').then(c => c.LazyComponent)}];`,
  );

  // Add lazy route e2e
  await writeFile(
    'e2e/src/app.e2e-spec.ts',
    `
     import { browser, logging, element, by } from 'protractor';

     describe('workspace-project App', () => {
       it('should display lazy route', async () => {
         await browser.get(browser.baseUrl + '/lazy');
         expect(await element(by.css('app-lazy p')).getText()).toEqual('lazy works!');
       });

       afterEach(async () => {
         // Assert that there are no errors emitted from the browser
         const logs = await browser.manage().logs().get(logging.Type.BROWSER);
         expect(logs).not.toContain(jasmine.objectContaining({
           level: logging.Level.SEVERE,
         }));
       });
     });
   `,
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
      await ng('e2e');
    } catch (error) {
      console.error(`Test case AOT ${aot} with CSP header ${csp} failed.`);
      throw error;
    }
  }
}
