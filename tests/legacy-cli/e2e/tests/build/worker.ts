/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { join } from 'path';
import { expectFileToExist, expectFileToMatch, replaceInFile, writeFile } from '../../utils/fs';
import { ng } from '../../utils/process';

export default async function () {
  const workerPath = join('src', 'app', 'app.worker.ts');
  const snippetPath = join('src', 'app', 'app.component.ts');
  const projectTsConfig = 'tsconfig.json';
  const workerTsConfig = 'tsconfig.worker.json';

  // Enable Differential loading to run both size checks
  await replaceInFile(
    '.browserslistrc',
    'not IE 11',
    'IE 11',
  );

  await ng('generate', 'web-worker', 'app');
  await expectFileToExist(workerPath);
  await expectFileToExist(projectTsConfig);
  await expectFileToExist(workerTsConfig);
  await expectFileToMatch(snippetPath, `new Worker(new URL('./app.worker', import.meta.url)`);

  await ng('build', '--configuration=development');
  await expectFileToExist('dist/test-project/src_app_app_worker_ts-es5.js');
  await expectFileToMatch('dist/test-project/main-es5.js', 'src_app_app_worker_ts');
  await expectFileToExist('dist/test-project/src_app_app_worker_ts-es2017.js');
  await expectFileToMatch('dist/test-project/main-es2017.js', 'src_app_app_worker_ts');

  await ng('build', '--output-hashing=none');
  await expectFileToExist('dist/test-project/609-es5.js');
  await expectFileToMatch('dist/test-project/main-es5.js', '609');
  await expectFileToExist('dist/test-project/609-es2017.js');
  await expectFileToMatch('dist/test-project/main-es2017.js', '609');

  // console.warn has to be used because chrome only captures warnings and errors by default
  // https://github.com/angular/protractor/issues/2207
  await replaceInFile('src/app/app.component.ts', 'console.log', 'console.warn');

  await writeFile('e2e/app.e2e-spec.ts', `
    import { AppPage } from './app.po';
    import { browser, logging } from 'protractor';
    describe('worker bundle', () => {
      it('should log worker messages', async () => {
        const page = new AppPage();;
        page.navigateTo();
        const logs = await browser.manage().logs().get(logging.Type.BROWSER);
        expect(logs.length).toEqual(1);
        expect(logs[0].message).toContain('page got message: worker response to hello');
      });
    });
  `);

  await ng('e2e');
}
