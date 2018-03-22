import { ng, silentNpm } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';

export default async function () {
  // typescript@2.8.0-dev.20180320 is not part of the officially supported range in latest stable.
  let unsupportedTsVersion = '2.8.0-dev.20180320';

  await updateJsonFile('projects/test-project/tsconfig.app.json', configJson => {
    configJson.angularCompilerOptions = {
      ...configJson.angularCompilerOptions,
      disableTypeScriptVersionCheck: true,
    };
  });

  return Promise.resolve()
    // Warning should show.
    .then(() => silentNpm('install', `typescript@${unsupportedTsVersion}`, '--no-save'))
    .then(() => ng('build'))
    .then((output) => {
      if (!output.stdout.match('Using this version can result in undefined behaviour')) {
        throw new Error('Expected to have typescript version mismatch warning in output.');
      }
    });
    /*
    // Warning should be disabled with global flag.
    .then(() => ng('config', '--global', 'warnings.typescriptMismatch', 'false'))
    .then(() => ng('build'))
    .then((output) => {
      if (output.stdout.match('Using this version can result in undefined behaviour')) {
        throw new Error('Expected to not have typescript version mismatch warning in output.');
      }
    })
    .then(() => ng('config', '--global', 'warnings.typescriptMismatch', 'true'))
    // Warning should be disabled with local flag.
    .then(() => ng('config', 'warnings.typescriptMismatch', 'false'))
    .then(() => ng('build'))
    .then((output) => {
      if (output.stdout.match('Using this version can result in undefined behaviour')) {
        throw new Error('Expected to not have typescript version mismatch warning in output.');
      }
    })
    .then(() => ng('config', 'warnings.typescriptMismatch', 'true'))
    // Cleanup
    .then(() => silentNpm('install'));
    */
}

