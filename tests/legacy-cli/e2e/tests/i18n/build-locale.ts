import { getGlobalVariable } from '../../utils/env';
import { expectFileToMatch, rimraf } from '../../utils/fs';
import { ng } from '../../utils/process';

export default async function () {
  const argv = getGlobalVariable('argv');
  const veEnabled = argv['ve'];
  if (!veEnabled) {
    return;
  }

  // These tests should be moved to the default when we use ng5 in new projects.
  return Promise.resolve()
    // tests for register_locale_data transformer
    .then(() => ng('build', '--aot', '--i18n-locale=fr'))
    .then(() => expectFileToMatch('dist/test-project/main-es5.js', /registerLocaleData/))
    .then(() => expectFileToMatch('dist/test-project/main-es5.js', /angular_common_locales_fr/))
    .then(() => expectFileToMatch('dist/test-project/main-es2015.js', /registerLocaleData/))
    .then(() => expectFileToMatch('dist/test-project/main-es2015.js', /angular_common_locales_fr/))
    .then(() => expectFileToMatch('dist/test-project/index.html', /lang="fr"/))
    .then(() => rimraf('dist'))
    .then(() => ng('build', '--aot', '--i18n-locale=fr_FR'))
    .then(() => expectFileToMatch('dist/test-project/main-es2015.js', /registerLocaleData/))
    .then(() => expectFileToMatch('dist/test-project/main-es2015.js', /angular_common_locales_fr/))
    .then(() => expectFileToMatch('dist/test-project/main-es5.js', /registerLocaleData/))
    .then(() => expectFileToMatch('dist/test-project/main-es5.js', /angular_common_locales_fr/))
    .then(() => expectFileToMatch('dist/test-project/index.html', /lang="fr_FR"/))
    .then(() => rimraf('dist'));
}
