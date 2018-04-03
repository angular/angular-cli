import { ng } from '../../utils/process';
import { writeFile } from '../../utils/fs';
import { expectToFail } from '../../utils/utils';
import { join } from 'path';

export default function() {
  // TODO(architect): Delete this test. It is now in devkit/build-angular.

  return ng('generate', 'component', 'i18n-test')
    .then(() => writeFile(
      join('src/app/i18n-test', 'i18n-test.component.html'),
      '<p i18n>Hello world <span i18n>inner</span></p>'))
    .then(() => expectToFail(() => ng('xi18n')))
    .then(({ message }) => {
      if (!message.includes('Could not mark an element as' +
          ' translatable inside a translatable section')) {
        throw new Error(`Expected i18n extraction error, got this instead:\n${message}`);
      }
    });
}
