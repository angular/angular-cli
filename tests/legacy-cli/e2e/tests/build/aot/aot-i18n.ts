import { ng } from '../../../utils/process';
import { expectFileToMatch, writeFile, createDir, appendToFile, readFile } from '../../../utils/fs';
import { expectToFail } from '../../../utils/utils';
import { Version } from '../../../../../packages/@angular/cli/upgrade/version';
import { SemVer } from 'semver';

// tslint:disable:max-line-length
export default function () {
  // TODO(architect): Delete this test. It is now in devkit/build-angular.

  return Promise.resolve()
    .then(() => createDir('src/locale'))
    .then(() => writeFile('src/locale/messages.fr.xlf', `
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
        </xliff>`))
    .then(() => appendToFile('src/app/app.component.html',
      '<h1 i18n="An introduction header for this sample">Hello i18n!</h1>'))
    .then(() => ng('build', '--aot', '--i18n-file', 'src/locale/messages.fr.xlf', '--i18n-format',
      'xlf', '--i18n-locale', 'fr'))
    .then(() => expectFileToMatch('dist/test-project/main-es5.js', /Bonjour i18n!/))
    .then(() => expectFileToMatch('dist/test-project/main-es2015.js', /Bonjour i18n!/))
    .then(() => ng('build', '--aot'))
    .then(() => expectToFail(() => expectFileToMatch('dist/test-project/main-es5.js', /Bonjour i18n!/)))
    .then(() => expectToFail(() => expectFileToMatch('dist/test-project/main-es2015.js', /Bonjour i18n!/)))
    .then(() => expectFileToMatch('dist/test-project/main-es2015.js', /Hello i18n!/))
    .then(() => expectFileToMatch('dist/test-project/main-es5.js', /Hello i18n!/))
    .then(() => appendToFile('src/app/app.component.html',
      '<p i18n>Other content</p>'))
    .then(() => ng('build', '--aot', '--i18nFile', 'src/locale/messages.fr.xlf', '--i18nFormat',
      'xlf', '--i18n-locale', 'fr', '--i18n-missing-translation', 'ignore'))
    .then(() => expectFileToMatch('dist/test-project/main-es5.js', /Other content/))
    .then(() => expectFileToMatch('dist/test-project/main-es2015.js', /Other content/))
    .then(() => expectToFail(() => ng('build', '--aot', '--i18nFile', 'src/locale/messages.fr.xlf',
      '--i18nFormat', 'xlf', '--i18n-locale', 'fr', '--i18n-missing-translation', 'error')));
}
