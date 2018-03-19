import { ng, npm } from '../../../utils/process';
import { updateJsonFile } from '../../../utils/project';

export default async function () {
  // TODO(architect): this test fails with weird fsevents install errors.
  // Investigate and re-enable afterwards.

  // Disable the strict TS version check for nightly
  await updateJsonFile('projects/test-project/src/tsconfig.app.json', configJson => {
    configJson.angularCompilerOptions = {
      ...configJson.angularCompilerOptions,
      disableTypeScriptVersionCheck: true,
    };
  });

  await npm('install', 'typescript@2.7');
  await ng('build');
  await ng('build', '--optimization');
  await npm('install', 'typescript@2.6');
}
