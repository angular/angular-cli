import {ng} from '../../utils/process';
import {expectFileToMatch, writeFile, createDir, appendToFile} from '../../utils/fs';

export default function() {
  return Promise.resolve()
    .then(() => createDir('src/locale'))
    .then(() => writeFile('src/locale/messages.fr.xlf', `
      <?xml version="1.0" encoding="UTF-8" ?>
        <xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">
         <file source-language="en" datatype="plaintext" original="ng2.template">
           <body>
             <trans-unit id="af2ccf4b5dba59616e92cf1531505af02da8f6d2" datatype="html">
               <source>Hello i18n!</source>
               <target>Bonjour i18n!</target>
               <note priority="1" from="description">An introduction header for this sample</note>
               <note priority="1" from="meaning">User welcome</note>
             </trans-unit>
           </body>
         </file>
        </xliff>`))
    .then(() => appendToFile('src/app/app.component.html', '<h1 i18n="User welcome|An introduction header for this sample">Hello i18n!</h1>'))
    .then(() => ng('build', '--aot', '--i18n-file', 'src/locale/messages.fr.xlf' ,'--i18n-format', 'xlf', '--locale', 'fr'))
    .then(() => expectFileToMatch('dist/main.bundle.js', /Bonjour i18n!/));
}
