import { ng, silentNpm } from '../../utils/process';
import { getGlobalVariable } from '../../utils/env';


export default function () {
  // typescript@2.5 is not part of the officially supported range in latest stable.
  // Update as needed.
  let unsupportedTsVersion = '2.5';

  // TODO: re-enable for ng5, adjust as needed. This test fails on ng5 because the 2.5 is supported.
  // When ng5 because the default this test will need to be adjusted to use 2.3 as the unsupported
  // version, and to disable the experimental angular compiler (transforms need 2.4 minimum).
  if (getGlobalVariable('argv').nightly) {
    return;
  }

  return Promise.resolve()
    // Warning should show.
    .then(() => silentNpm('install', `typescript@${unsupportedTsVersion}`, '--no-save'))
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
    .then(() => silentNpm('install'));
}

