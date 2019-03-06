/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { replaceInFile, writeFile } from '../../utils/fs';
import { ng } from '../../utils/process';
import { createProject, updateJsonFile } from '../../utils/project';
import { expectToFail } from '../../utils/utils';

export async function ivyLazyLoadSetup(projectName: string) {
  // Make Ivy project.
  await createProject(projectName, '--enable-ivy', '--routing');

  // Add lazy route.
  await ng('generate', 'module', 'lazy', '--routing');
  await replaceInFile('src/app/app-routing.module.ts', 'const routes: Routes = [];', `
    const routes: Routes = [{ path: 'lazy', loadChildren: LOAD_CHILDREN_MARKER }];
  `);
  await ng('generate', 'component', 'lazy/lazy-comp');
  await replaceInFile('src/app/lazy/lazy-routing.module.ts', 'const routes: Routes = [];', `
    import { LazyCompComponent } from './lazy-comp/lazy-comp.component';
    const routes: Routes = [{ path: '', component: LazyCompComponent }];
  `);
  await writeFile('src/app/app.component.html', '<router-outlet></router-outlet>');

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

  // Set factory shims to false.
  await updateJsonFile('tsconfig.app.json', json => {
    const angularCompilerOptions = json['angularCompilerOptions'];
    angularCompilerOptions['allowEmptyCodegenFiles'] = false;
  });

  // Convert the default config to use JIT and prod to just do AOT.
  // This way we can use `ng e2e` to test JIT and `ng e2e --prod` to test AOT.
  await updateJsonFile('angular.json', json => {
    const buildTarget = json['projects'][projectName]['architect']['build'];
    buildTarget['options']['aot'] = false;
    buildTarget['configurations']['production'] = { aot: true };
  });
}

export default async function () {
  // Test `import()` style lazy load.
  await ivyLazyLoadSetup('ivy-lazy-import');
  await replaceInFile('src/app/app-routing.module.ts', 'LOAD_CHILDREN_MARKER', `
   () => import('./lazy/lazy.module').then(m => m.LazyModule)
  `);
  await ng('e2e');
  await ng('e2e', '--prod');

  // Test string import with factory shims.
  await ivyLazyLoadSetup('ivy-lazy-string-shims');
  await replaceInFile('src/app/app-routing.module.ts', 'LOAD_CHILDREN_MARKER',
    `'./lazy/lazy.module#LazyModule'`);
  await replaceInFile('tsconfig.app.json', `"allowEmptyCodegenFiles": false`,
    `"allowEmptyCodegenFiles": true`);
  await expectToFail(() => ng('e2e')); // Currently broken.
  await ng('e2e', '--prod');

  // Test string import without factory shims.
  await ivyLazyLoadSetup('ivy-lazy-string-no-shims');
  await replaceInFile('src/app/app-routing.module.ts', 'LOAD_CHILDREN_MARKER',
    `'./lazy/lazy.module#LazyModule'`);
  await expectToFail(() => ng('e2e')); // Not supported.
  await expectToFail(() => ng('e2e', '--prod')); // Not supported.
}
