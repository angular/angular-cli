import { join } from 'path';
import { ng } from '../../utils/process';
import { writeFile, expectFileToMatch } from '../../utils/fs';
import { getGlobalVariable } from '../../utils/env';


export default async function () {
  if (!getGlobalVariable('argv')['ve']) {
    return;
  }

  await ng('generate', 'component', 'i18n-test');
  await writeFile(
    join('src/app/i18n-test', 'i18n-test.component.html'),
    '<p i18n>Hello world</p>',
  );
  await ng('extract-i18n', '--out-file', 'messages.fr.xlf');
  await expectFileToMatch('messages.fr.xlf', 'Hello world');
}
