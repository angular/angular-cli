import { join } from 'path';
import { expectFileToExist, expectFileToMatch, writeFile } from '../../utils/fs';
import { ng } from '../../utils/process';


export default async function() {
  // TODO(architect): Delete this test. It is now in devkit/build-angular.

  await ng('generate', 'component', 'i18n-test');
  await writeFile(
    join('src/app/i18n-test', 'i18n-test.component.html'),
    '<p i18n>Hello world</p>',
  );
  await ng('xi18n');
  await expectFileToExist('messages.xlf');
  await expectFileToMatch('messages.xlf', /Hello world/);
}
