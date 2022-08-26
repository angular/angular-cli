/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { readdir } from 'fs/promises';
import { expectFileToExist, expectFileToMatch, replaceInFile, writeFile } from '../../utils/fs';
import { ng } from '../../utils/process';

export default async function () {
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
  await expectFileToExist('dist/test-project/src_app_app_worker_ts.js');
  await expectFileToMatch('dist/test-project/main.js', 'src_app_app_worker_ts');

  await ng('build', '--output-hashing=none');

  const chunkId = await getWorkerChunkId();
  await expectFileToExist(`dist/test-project/${chunkId}.js`);
  await expectFileToMatch('dist/test-project/main.js', chunkId);

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

async function getWorkerChunkId(): Promise<string> {
  const files = await readdir('dist/test-project');
  const fileName = files.find((f) => /^\d{3}\.js$/.test(f));

  if (!fileName) {
    throw new Error('Cannot determine worker chunk Id.');
  }

  return fileName.substring(0, 3);
}
