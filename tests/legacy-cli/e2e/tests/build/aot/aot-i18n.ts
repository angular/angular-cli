import { appendToFile, createDir, expectFileToMatch, writeFile } from '../../../utils/fs';
import { ng } from '../../../utils/process';
import { updateJsonFile } from '../../../utils/project';
import { expectToFail } from '../../../utils/utils';

export default async function () {
  const enDir = 'dist/test-project';
  const frDist = `${enDir}-fr`;
  const deDir = `${enDir}-de`;

  await updateJsonFile('angular.json', workspaceJson => {
    const appArchitect = workspaceJson.projects['test-project'].architect;
    const browserConfigs = appArchitect['build'].configurations;
    browserConfigs['fr'] = {
      outputPath: frDist,
      aot: true,
      i18nFile: 'src/locale/messages.fr.xlf',
      i18nFormat: 'xlf',
      i18nLocale: 'fr',
    };
    browserConfigs['de'] = {
      outputPath: deDir,
      aot: true,
      i18nFile: 'src/locale/messages.de.xlf',
      i18nFormat: 'xlf',
      i18nLocale: 'de',
    };
  });

  await createDir('src/locale');
  await writeFile('src/locale/messages.fr.xlf', `
    <?xml version="1.0" encoding="UTF-8" ?>
      <xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">
        <file source-language="en" datatype="plaintext" original="ng2.template">
          <body>
            <trans-unit id="8def8481e91291a52f9baa31cbdb313e6a6ca02b" datatype="html">
              <source>Hello i18n!</source>
              <target>Bonjour i18n!</target>
              <note priority="1" from="description">An introduction header for this sample</note>
            </trans-unit>
          </body>
        </file>
      </xliff>`);
  await writeFile('src/locale/messages.de.xlf', `
    <?xml version="1.0" encoding="UTF-8" ?>
      <xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">
        <file source-language="en" datatype="plaintext" original="ng2.template">
          <body>
            <trans-unit id="8def8481e91291a52f9baa31cbdb313e6a6ca02b" datatype="html">
              <source>Hello i18n!</source>
              <target>Hallo i18n!</target>
              <note priority="1" from="description">An introduction header for this sample</note>
            </trans-unit>
          </body>
        </file>
      </xliff>`);
  await appendToFile('src/app/app.component.html',
    '<h1 i18n="An introduction header for this sample">Hello i18n!</h1>');
  await ng('build', '--configuration=fr');
  await expectFileToMatch(`${frDist}/main-es5.js`, /Bonjour i18n!/);
  await expectFileToMatch(`${frDist}/main-es2015.js`, /Bonjour i18n!/);
  await ng('build', '--configuration=de');
  await expectFileToMatch(`${deDir}/main-es5.js`, /Hallo i18n!/);
  await expectFileToMatch(`${deDir}/main-es2015.js`, /Hallo i18n!/);
  await ng('build', '--aot');
  await expectToFail(() => expectFileToMatch(`${enDir}/main-es5.js`, /Bonjour i18n!/));
  await expectToFail(() => expectFileToMatch(`${enDir}/main-es2015.js`, /Bonjour i18n!/));
  await expectToFail(() => expectFileToMatch(`${enDir}/main-es5.js`, /Hallo i18n!/));
  await expectToFail(() => expectFileToMatch(`${enDir}/main-es2015.js`, /Hallo i18n!/));
  await expectFileToMatch(`${enDir}/main-es2015.js`, /Hello i18n!/);
  await expectFileToMatch(`${enDir}/main-es5.js`, /Hello i18n!/);
  await appendToFile('src/app/app.component.html', '<p i18n>Other content</p>');
  await ng('build', '--configuration=fr', '--i18n-missing-translation', 'ignore');
  await expectFileToMatch(`${frDist}/main-es5.js`, /Other content/);
  await expectFileToMatch(`${frDist}/main-es2015.js`, /Other content/);
  await expectToFail(() => ng('build', '--configuration=fr', '--i18n-missing-translation', 'error'));
}
