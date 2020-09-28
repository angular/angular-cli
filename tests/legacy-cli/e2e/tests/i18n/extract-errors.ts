import { ng } from '../../utils/process';
import { writeFile } from '../../utils/fs';
import { expectToFail } from '../../utils/utils';
import { join } from 'path';
import { getGlobalVariable } from '../../utils/env';

export default async function () {
  // TODO(architect): Delete this test. It is now in devkit/build-angular.
  if (!getGlobalVariable('argv')['ve']) {
    return;
  }

  await ng('generate', 'component', 'i18n-test');
  await writeFile(
    join('src/app/i18n-test', 'i18n-test.component.html'),
    '<p i18n>Hello world <span i18n>inner</span></p>',
  );

  const { message } = await expectToFail(() => ng('xi18n'));

  const veProject = getGlobalVariable('argv')['ve'];
  const msg = veProject
    ? 'Could not mark an element as translatable inside a translatable section'
    : 'Cannot mark an element as translatable inside of a translatable section';
  if (!message.includes(msg)) {
    throw new Error(`Expected i18n extraction error, got this instead:\n${message}`);
  }
}
