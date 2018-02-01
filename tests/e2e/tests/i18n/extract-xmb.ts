import {join} from 'path';
import {ng} from '../../utils/process';
import {
  expectFileToExist, writeFile,
  expectFileToMatch
} from '../../utils/fs';


export default function() {
  return ng('generate', 'component', 'i18n-test')
    .then(() => writeFile(
      join('src/app/i18n-test', 'i18n-test.component.html'),
      '<p i18n>Hello world</p>'))
    .then(() => ng('xi18n', '--i18n-format', 'xmb'))
    .then(() => expectFileToExist(join('src', 'messages.xmb')))
    .then(() => expectFileToMatch(join('src', 'messages.xmb'), /Hello world/));
}
