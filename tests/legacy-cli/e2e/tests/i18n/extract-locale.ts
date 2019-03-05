import { join } from 'path';
import { ng } from '../../utils/process';
import { writeFile, expectFileToMatch } from '../../utils/fs';


export default function() {
  // TODO(architect): Delete this test. It is now in devkit/build-angular.

  return ng('generate', 'component', 'i18n-test')
    .then(() => writeFile(
      join('src/app/i18n-test', 'i18n-test.component.html'),
      '<p i18n>Hello world</p>'))
    .then(() => ng('xi18n', '--i18n-locale', 'fr'))
    .then((output) => {
      if (!output.stderr.match(/starting from Angular v4/)) {
        return expectFileToMatch('messages.xlf', 'source-language="fr"');
      }
    });
}
