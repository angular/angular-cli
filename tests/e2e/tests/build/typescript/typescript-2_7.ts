import { ng, npm } from '../../../utils/process';
import { updateJsonFile } from '../../../utils/project';

export default async function () {
  // Disable the strict TS version check for nightly
  await updateJsonFile('projects/test-project/tsconfig.app.json', configJson => {
    configJson.angularCompilerOptions = {
      ...configJson.angularCompilerOptions,
      disableTypeScriptVersionCheck: true,
    };
  });

  await npm('install', 'typescript@2.7');
  await ng('build');
  await ng('build', '--prod');
  await npm('install', 'typescript@2.6');
}
