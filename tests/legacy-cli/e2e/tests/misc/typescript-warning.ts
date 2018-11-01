import { ng, silentNpm } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';

export default async function () {
  // typescript@3.0.1 is not part of the officially supported range in latest stable.
  const unsupportedTsVersion = '3.0.1';

  await updateJsonFile('src/tsconfig.app.json', configJson => {
    // skipLibCheck is required because declerations
    // emitted in TS 3.1 are not compatable with TS 2.8
    // Thus it will exit with a non zero error code.
    configJson.compilerOptions = {
      ...configJson.compilerOptions,
      skipLibCheck: true,
    };
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
      if (!output.stderr.match('Using this version can result in undefined behaviour')) {
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

