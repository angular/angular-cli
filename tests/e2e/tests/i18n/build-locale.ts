import { ng } from '../../utils/process';
import { expectFileToMatch, rimraf } from '../../utils/fs';
import { getGlobalVariable } from '../../utils/env';
import { expectToFail } from '../../utils/utils';


export default function () {
  // Check if register locale works in ng5 prod builds
  // This check should be changed once ng5 because the default.
  if (!getGlobalVariable('argv').nightly) {
    return Promise.resolve();
  }

  // These tests should be moved to the default when we use ng5 in new projects.
  return Promise.resolve()
    // tests for register_locale_data transformer
    .then(() => ng('build', '--aot', '--locale=fr'))
    .then(() => expectFileToMatch('dist/main.bundle.js', /registerLocaleData/))
    .then(() => expectFileToMatch('dist/main.bundle.js', /angular_common_locales_fr/))
    .then(() => rimraf('dist'))
    .then(() => expectToFail(() => ng('build', '--aot', '--locale=no-locale')))
}
