import { moveFile } from '../../../utils/fs';
import { silentNg } from '../../../utils/process';

export default async function () {
  // Should accept different config file
  await moveFile('./e2e/protractor.conf.js', './e2e/renamed-protractor.conf.js');
  await silentNg('e2e', 'test-project', '--protractor-config=e2e/renamed-protractor.conf.js');
}
