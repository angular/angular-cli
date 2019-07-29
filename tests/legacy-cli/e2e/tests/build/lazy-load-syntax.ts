/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { getGlobalVariable } from '../../utils/env';
import { appendToFile, prependToFile, readFile, replaceInFile, writeFile } from '../../utils/fs';
import { ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';

export default async function () {
  const projectName = 'test-project';
  const appRoutingModulePath = 'src/app/app-routing.module.ts';

  // Add app routing.
  // This is done automatically on a new app with --routing.
  await writeFile(appRoutingModulePath, `
    import { NgModule } from '@angular/core';
    import { Routes, RouterModule } from '@angular/router';

    const routes: Routes = [];

    @NgModule({
      imports: [RouterModule.forRoot(routes)],
      exports: [RouterModule]
    })
    export class AppRoutingModule { }
  `);
  await prependToFile('src/app/app.module.ts',
    `import { AppRoutingModule } from './app-routing.module';`);
  await replaceInFile('src/app/app.module.ts', `imports: [`, `imports: [ AppRoutingModule,`);
  await appendToFile('src/app/app.component.html', '<router-outlet></router-outlet>');

  const originalAppRoutingModule = await readFile(appRoutingModulePath);
  // helper to replace loadChildren
  const replaceLoadChildren = async (route: string) => {
    const content = originalAppRoutingModule.replace('const routes: Routes = [];', `
      const routes: Routes = [{ path: 'lazy', loadChildren: ${route} }];
    `);

    return writeFile(appRoutingModulePath, content);
  };

  // Add lazy route.
  await ng('generate', 'module', 'lazy', '--routing');
  await ng('generate', 'component', 'lazy/lazy-comp');
  await replaceInFile('src/app/lazy/lazy-routing.module.ts', 'const routes: Routes = [];', `
    import { LazyCompComponent } from './lazy-comp/lazy-comp.component';
    const routes: Routes = [{ path: '', component: LazyCompComponent }];
  `);

  // Add lazy route e2e
  await writeFile('e2e/src/app.e2e-spec.ts', `
    import { browser, logging, element, by } from 'protractor';

    describe('workspace-project App', () => {
      it('should display lazy route', () => {
        browser.get(browser.baseUrl + '/lazy');
        expect(element(by.css('app-lazy-comp p')).getText()).toEqual('lazy-comp works!');
      });

      afterEach(async () => {
        // Assert that there are no errors emitted from the browser
        const logs = await browser.manage().logs().get(logging.Type.BROWSER);
        expect(logs).not.toContain(jasmine.objectContaining({
          level: logging.Level.SEVERE,
        }));
      });
    });
  `);

  // Convert the default config to use JIT and prod to just do AOT.
  // This way we can use `ng e2e` to test JIT and `ng e2e --prod` to test AOT.
  await updateJsonFile('angular.json', json => {
    const buildTarget = json['projects'][projectName]['architect']['build'];
    buildTarget['options']['aot'] = false;
    buildTarget['configurations']['production'] = { aot: true };
  });

  // Test `import()` style lazy load.
  // Both Ivy and View Engine should support it.
  await replaceLoadChildren(`() => import('./lazy/lazy.module').then(m => m.LazyModule)`);

  await ng('e2e');
  await ng('e2e', '--prod');

  // Test string import.
  // Both Ivy and View Engine should support it.
  await updateJsonFile('tsconfig.app.json', tsConfig => {
    tsConfig.files.push('src/app/lazy/lazy.module.ts');
  });
  await replaceLoadChildren(`'./lazy/lazy.module#LazyModule'`);
  await ng('e2e');
  await ng('e2e', '--prod');
}
