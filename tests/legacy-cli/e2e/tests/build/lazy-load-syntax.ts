/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { setTimeout } from 'node:timers/promises';
import { replaceInFile, writeFile } from '../../utils/fs';
import { ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';

export default async function () {
  // Add lazy route.
  await ng('generate', 'component', 'lazy-comp');
  await replaceInFile(
    'src/app/app.routes.ts',
    'routes: Routes = [];',
    `routes: Routes = [{
      path: 'lazy',
      loadComponent: () => import('./lazy-comp/lazy-comp.component').then(c => c.LazyCompComponent),
    }];`,
  );

  // Add lazy route e2e
  await writeFile(
    'e2e/src/app.e2e-spec.ts',
    `
      import { browser, logging, element, by } from 'protractor';

      describe('workspace-project App', () => {
        it('should display lazy route', async () => {
          await browser.get(browser.baseUrl + '/lazy');
          expect(await element(by.css('app-lazy-comp p')).getText()).toEqual('lazy-comp works!');
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

  // Convert the default config to use JIT and prod to just do AOT.
  // This way we can use `ng e2e` to test JIT and `ng e2e --configuration=production` to test AOT.
  await updateJsonFile('angular.json', (json) => {
    const buildTarget = json['projects']['test-project']['architect']['build'];
    buildTarget['options']['aot'] = true;
    buildTarget['configurations']['development']['aot'] = false;
  });

  await ng('e2e');
  await setTimeout(500);
  await ng('e2e', '--configuration=production');
}
