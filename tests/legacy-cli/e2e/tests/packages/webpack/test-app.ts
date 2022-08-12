import { normalize } from 'path';
import { createProjectFromAsset } from '../../../utils/assets';
import { expectFileSizeToBeUnder, expectFileToMatch, replaceInFile } from '../../../utils/fs';
import { execWithEnv } from '../../../utils/process';

export default async function () {
  const webpackCLIBin = normalize('node_modules/.bin/webpack-cli');
  const restoreRegistry = await createProjectFromAsset('webpack/test-app');

  // DISABLE_V8_COMPILE_CACHE=1 is required to disable the `v8-compile-cache` package.
  // It currently does not support dynamic import expressions which are now required by the
  // CLI to support ESM. ref: https://github.com/zertosh/v8-compile-cache/issues/30
  await execWithEnv(webpackCLIBin, [], { ...process.env, 'DISABLE_V8_COMPILE_CACHE': '1' });

  // Note: these sizes are without Build Optimizer or any advanced optimizations in the CLI.
  await expectFileSizeToBeUnder('dist/app.main.js', 656 * 1024);
  await expectFileSizeToBeUnder('dist/501.app.main.js', 1 * 1024);
  await expectFileSizeToBeUnder('dist/888.app.main.js', 2 * 1024);
  await expectFileSizeToBeUnder('dist/972.app.main.js', 2 * 1024);

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
