/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import { setTimeout } from 'node:timers/promises';
import { getGlobalVariable } from '../../utils/env';
import { expectFileToExist, expectFileToMatch, replaceInFile, writeFile } from '../../utils/fs';
import { ng } from '../../utils/process';
import { expectToFail } from '../../utils/utils';
import { executeBrowserTest } from '../../utils/puppeteer';

export default async function () {
  const useWebpackBuilder = !getGlobalVariable('argv')['esbuild'];

  const workerPath = 'src/app/app.worker.ts';
  const snippetPath = 'src/app/app.ts';
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
  await replaceInFile('src/app/app.ts', 'console.log', 'console.warn');

  await executeBrowserTest({
    checkFn: async (page) => {
      const messages: string[] = [];
      page.on('console', (msg) => {
        messages.push(msg.text());
      });

      // Reload to ensure we capture messages from the start if needed,
      // although executeBrowserTest already navigated.
      await page.reload();

      // Wait for the worker message
      let retries = 50;
      while (
        !messages.some((m) => m.includes('page got message: worker response to hello')) &&
        retries > 0
      ) {
        await setTimeout(100);
        retries--;
      }

      if (!messages.some((m) => m.includes('page got message: worker response to hello'))) {
        assert.fail(`Expected worker message not found in console. Got:\n${messages.join('\n')}`);
      }
    },
  });
}

async function getWorkerOutputFile(useWebpackBuilder: boolean): Promise<string> {
  const files = await readdir('dist/test-project/browser');
  let fileName;
  if (useWebpackBuilder) {
    fileName = files.find((f) => /^\d{3}\.js$/.test(f));
  } else {
    fileName = files.find((f) => /worker-[\dA-Z]{8}\.js/.test(f));
  }

  assert(fileName, 'Cannot determine worker output file name.');

  return fileName;
}
