/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { appendToFile, prependToFile, replaceInFile, writeFile } from '../../utils/fs';
import { ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';

export default async function () {
  // Add app routing.
  // This is done automatically on a new app with --routing.
  await prependToFile('src/app/app.module.ts', `import { RouterModule } from '@angular/router';`);
  await replaceInFile(
    'src/app/app.module.ts',
    `imports: [`,
    `imports: [ RouterModule.forRoot([]),`,
  );
  await appendToFile('src/app/app.component.html', '<router-outlet></router-outlet>');

  // Add lazy route.
  await ng('generate', 'module', 'lazy', '--route', 'lazy', '--module', 'app.module');

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
