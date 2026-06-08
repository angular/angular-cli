/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { replaceInFile } from '../../utils/fs';
import { ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';
import { executeBrowserTest } from '../../utils/puppeteer';

export default async function () {
  // Add lazy route.
  await ng('generate', 'component', 'lazy-comp');
  await replaceInFile(
    'src/app/app.routes.ts',
    'routes: Routes = [];',
    `routes: Routes = [{
      path: 'lazy',
      loadComponent: () => import('./lazy-comp/lazy-comp').then(c => c.LazyComp),
    }];`,
  );

  // Convert the default config to use JIT and prod to just do AOT.
  // This way we can use `ng e2e` to test JIT and `ng e2e --configuration=production` to test AOT.
  await updateJsonFile('angular.json', (json) => {
    const buildTarget = json['projects']['test-project']['architect']['build'];
    buildTarget['options']['aot'] = true;
    buildTarget['configurations']['development']['aot'] = false;
  });

  const checkFn = async (page: any) => {
    await page.goto(page.url() + 'lazy');
    await page.waitForFunction(
      () =>
        !!(globalThis as any).document
          .querySelector('app-lazy-comp p')
          ?.textContent?.includes('lazy-comp works!'),
      { timeout: 10000 },
    );
  };

  await executeBrowserTest({ checkFn });
  await executeBrowserTest({ configuration: 'production', checkFn });
}
