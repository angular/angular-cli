import {join} from 'path';
import {ng} from '../../utils/process';
import {
  expectFileToExist, writeFile,
  expectFileToMatch
} from '../../utils/fs';


export default function() {
  // TODO(architect): Delete this test. It is now in devkit/build-angular.

  return ng('generate', 'component', 'i18n-test')
    .then(() => writeFile(
      join('projects/test-project/src/app/i18n-test', 'i18n-test.component.html'),
      '<p i18n>Hello world</p>'))
    .then(() => ng('xi18n'))
    .then(() => expectFileToExist(join('projects/test-project', 'messages.xlf')))
    .then(() => expectFileToMatch(join('projects/test-project', 'messages.xlf'), /Hello world/));
}
