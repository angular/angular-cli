import { ng, npm } from '../../../utils/process';
import { updateJsonFile } from '../../../utils/project';

export default async function () {
  // This test should only be active when the current version of Angular supports multiple
  // TypeScript minor versions.
  return;

  // Disable the strict TS version check for snapshots
  await updateJsonFile('src/tsconfig.app.json', configJson => {
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
