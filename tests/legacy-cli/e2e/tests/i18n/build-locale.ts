import { getGlobalVariable } from '../../utils/env';
import { expectFileToMatch, rimraf } from '../../utils/fs';
import { ng } from '../../utils/process';

export default async function () {
  const argv = getGlobalVariable('argv');
  const veEnabled = argv['ve'];
  if (!veEnabled) {
    return;
  }

  // tests for register_locale_data transformer
  await ng('build', '--aot', '--i18n-locale=fr', '--configuration=development');
  await expectFileToMatch('dist/test-project/main.js', /registerLocaleData/);
  await expectFileToMatch('dist/test-project/main.js', /angular_common_locales_fr/);
  await expectFileToMatch('dist/test-project/index.html', /lang="fr"/);

  await rimraf('dist');
  await ng('build', '--aot', '--i18n-locale=fr_FR', '--configuration=development');
  await expectFileToMatch('dist/test-project/main.js', /registerLocaleData/);
  await expectFileToMatch('dist/test-project/main.js', /angular_common_locales_fr/);
  await expectFileToMatch('dist/test-project/index.html', /lang="fr_FR"/);
  await rimraf('dist');
}
