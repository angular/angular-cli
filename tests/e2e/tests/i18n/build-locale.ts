import { ng } from '../../utils/process';
import { expectFileToMatch, rimraf } from '../../utils/fs';
import { getGlobalVariable } from '../../utils/env';


export default function () {
  // Skip this test in Angular 2/4.
  if (getGlobalVariable('argv').ng2 || getGlobalVariable('argv').ng4) {
    return Promise.resolve();
  }

  // These tests should be moved to the default when we use ng5 in new projects.
  return Promise.resolve()
    // tests for register_locale_data transformer
    .then(() => ng('build', '--aot', '--locale=fr'))
    .then(() => expectFileToMatch('dist/main.js', /registerLocaleData/))
    .then(() => expectFileToMatch('dist/main.js', /angular_common_locales_fr/))
    .then(() => rimraf('dist'))
    .then(() => ng('build', '--aot', '--locale=fr_FR'))
    .then(() => expectFileToMatch('dist/main.js', /registerLocaleData/))
    .then(() => expectFileToMatch('dist/main.js', /angular_common_locales_fr/))
    .then(() => rimraf('dist'))
}
