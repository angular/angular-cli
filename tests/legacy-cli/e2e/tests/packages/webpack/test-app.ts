import { join, normalize } from 'path';
import { createProjectFromAsset } from '../../../utils/assets';
import { expectFileSizeToBeUnder, expectFileToMatch, replaceInFile } from '../../../utils/fs';
import { execWithEnv } from '../../../utils/process';
import { readdir } from 'node:fs/promises';
import assert from 'node:assert';

export default async function () {
  const webpackCLIBin = normalize('node_modules/.bin/webpack-cli');
  const restoreRegistry = await createProjectFromAsset('webpack/test-app');

  // DISABLE_V8_COMPILE_CACHE=1 is required to disable the `v8-compile-cache` package.
  // It currently does not support dynamic import expressions which are now required by the
  // CLI to support ESM. ref: https://github.com/zertosh/v8-compile-cache/issues/30
  await execWithEnv(webpackCLIBin, [], { ...process.env, 'DISABLE_V8_COMPILE_CACHE': '1' });

  // Note: these sizes are without Build Optimizer or any advanced optimizations in the CLI.
  await expectFileSizeToBeUnder('dist/app.main.js', 650 * 1024);
  const outputFiles = await readdir('dist', { withFileTypes: true });
  let fileCount = 0;
  for (const outputFile of outputFiles) {
    if (outputFile.isFile() && outputFile.name.endsWith('.app.main.js')) {
      ++fileCount;
      await expectFileSizeToBeUnder(join('dist', outputFile.name), 1024);
    }
  }
  if (fileCount !== 3) {
    assert.fail('Expected three additional Webpack output chunk files.');
  }

  // test resource urls without ./
  await replaceInFile('app/app.component.ts', './app.component.html', 'app.component.html');
  await replaceInFile('app/app.component.ts', './app.component.scss', 'app.component.scss');

  // test the inclusion of metadata
  // This build also test resource URLs without ./
  await execWithEnv(webpackCLIBin, ['--mode=development'], {
    ...process.env,
    'DISABLE_V8_COMPILE_CACHE': '1',
  });
  await expectFileToMatch('dist/app.main.js', 'AppModule');
  await restoreRegistry();
}
