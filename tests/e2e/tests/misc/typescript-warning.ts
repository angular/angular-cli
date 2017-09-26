import { ng, npm } from '../../utils/process';
import { getGlobalVariable } from '../../utils/env';


export default function () {
  // typescript@2.5 is not part of the officially supported range in latest stable.
  // Update as needed.
  let unsupportedTsVersion = '2.5';

    // Skip this in Appveyor tests.
  if (getGlobalVariable('argv').nightly) {
    unsupportedTsVersion = '2.3';
  }

  return Promise.resolve()
    .then(() => npm('uninstall', 'typescript', '--no-save'))
    .then(() => ng('build'))
    .catch((err) => {
      if (!err.message.match('Versions of @angular/compiler-cli and typescript could not')) {
        throw new Error('Expected to have missing dependency error in output.');
      }
    })
    // Warning should show.
    .then(() => npm('install', `typescript@${unsupportedTsVersion}`, '--no-save'))
    .then(() => ng('build'))
    .then((output) => {
      if (!output.stdout.match('Using this version can result in undefined behaviour')) {
        throw new Error('Expected to have typescript version mismatch warning in output.');
      }
    })
    // Warning should be disabled with global flag.
    .then(() => ng('set', '--global', 'warnings.typescriptMismatch=false'))
    .then(() => ng('build'))
    .then((output) => {
      if (output.stdout.match('Using this version can result in undefined behaviour')) {
        throw new Error('Expected to not have typescript version mismatch warning in output.');
      }
    })
    .then(() => ng('set', '--global', 'warnings.typescriptMismatch=true'))
    // Warning should be disabled with local flag.
    .then(() => ng('set', 'warnings.typescriptMismatch=false'))
    .then(() => ng('build'))
    .then((output) => {
      if (output.stdout.match('Using this version can result in undefined behaviour')) {
        throw new Error('Expected to not have typescript version mismatch warning in output.');
      }
    })
    .then(() => ng('set', 'warnings.typescriptMismatch=true'))
    // Cleanup
    .then(() => npm('install'));
}

