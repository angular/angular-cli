import {join} from 'path';
import {ng} from '../../utils/process';
import {
  expectFileToExist, deleteFile, writeFile,
  expectFileToMatch
} from '../../utils/fs';


export default function() {
  const testComponentDir = join('src/app', 'i18n-test');
  return ng('generate', 'component', 'i18n-test')
    .then(() => deleteFile(join(testComponentDir, 'i18n-test.component.html')))
    .then(() => writeFile(
      join(testComponentDir, 'i18n-test.component.html'),
      '<p i18n>Hello world</p>'))
    .then(() => ng('xi18n'))
    .then(() => expectFileToExist(join('src', 'messages.xlf')))
    .then(() => expectFileToMatch(join('src', 'messages.xlf'), /Hello world/));
}
