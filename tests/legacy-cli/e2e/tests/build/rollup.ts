/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { appendToFile, prependToFile, replaceInFile, writeFile } from '../../utils/fs';
import { ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';

export default async function () {
  // Add initial app routing.
  const appRoutingModulePath = 'src/app/app-routing.module.ts';
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

  // Add a lazy route.
  await ng('generate', 'module', 'lazy', '--route=lazy', '--module=app.module');

  // Add lazy route e2e
  await writeFile('e2e/src/app.e2e-spec.ts', `
    import { browser, logging, element, by } from 'protractor';

    describe('workspace-project App', () => {
      it('should display lazy route', () => {
        browser.get(browser.baseUrl + '/lazy');
        expect(element(by.css('app-lazy p')).getText()).toEqual('lazy works!');
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

  // Set options needed for Rollup.
  await updateJsonFile('angular.json', workspaceJson => {
    const appArchitect = workspaceJson.projects['test-project'].architect;
    const prodOptions = appArchitect.build.configurations.production;
    prodOptions.vendorChunk = false;
    prodOptions.commonChunk = false;
    prodOptions.namedChunks = false;
    prodOptions.experimentalRollupPass = true;
  });

  // Build for prod.
  await ng('build', '--prod');

  // E2E to make sure it's working.
  await ng('e2e', '--prod');
}
