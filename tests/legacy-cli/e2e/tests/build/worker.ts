/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { readdir } from 'node:fs/promises';
import { expectFileToExist, expectFileToMatch, replaceInFile, writeFile } from '../../utils/fs';
import { ng } from '../../utils/process';
import { getGlobalVariable } from '../../utils/env';
import { expectToFail } from '../../utils/utils';

export default async function () {
  const useWebpackBuilder = !getGlobalVariable('argv')['esbuild'];

  const workerPath = 'src/app/app.worker.ts';
  const snippetPath = 'src/app/app.component.ts';
  const projectTsConfig = 'tsconfig.json';
  const workerTsConfig = 'tsconfig.worker.json';

  await ng('generate', 'web-worker', 'app');
  await expectFileToExist(workerPath);
  await expectFileToExist(projectTsConfig);
  await expectFileToExist(workerTsConfig);
  await expectFileToMatch(snippetPath, `new Worker(new URL('./app.worker', import.meta.url)`);

  await ng('build', '--configuration=development');
  if (useWebpackBuilder) {
    await expectFileToExist('dist/test-project/browser/src_app_app_worker_ts.js');
    await expectFileToMatch('dist/test-project/browser/main.js', 'src_app_app_worker_ts');
  } else {
    const workerOutputFile = await getWorkerOutputFile(false);
    await expectFileToExist(`dist/test-project/browser/${workerOutputFile}`);
    await expectFileToMatch('dist/test-project/browser/main.js', workerOutputFile);
    await expectToFail(() =>
      expectFileToMatch('dist/test-project/browser/main.js', workerOutputFile + '.map'),
    );
  }

  await ng('build', '--output-hashing=none');

  const workerOutputFile = await getWorkerOutputFile(useWebpackBuilder);
  await expectFileToExist(`dist/test-project/browser/${workerOutputFile}`);
  if (useWebpackBuilder) {
    // Check Webpack builds for the numeric chunk identifier
    await expectFileToMatch('dist/test-project/browser/main.js', workerOutputFile.substring(0, 3));
  } else {
    await expectFileToMatch('dist/test-project/browser/main.js', workerOutputFile);
  }

  // console.warn has to be used because chrome only captures warnings and errors by default
  // https://github.com/angular/protractor/issues/2207
  await replaceInFile('src/app/app.component.ts', 'console.log', 'console.warn');

  await writeFile(
    'e2e/app.e2e-spec.ts',
    `
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
  `,
  );

  await ng('e2e');
}

async function getWorkerOutputFile(useWebpackBuilder: boolean): Promise<string> {
  const files = await readdir('dist/test-project/browser');
  let fileName;
  if (useWebpackBuilder) {
    fileName = files.find((f) => /^\d{3}\.js$/.test(f));
  } else {
    fileName = files.find((f) => /worker-[\dA-Z]{8}\.js/.test(f));
  }

  if (!fileName) {
    throw new Error('Cannot determine worker output file name.');
  }

  return fileName;
}
