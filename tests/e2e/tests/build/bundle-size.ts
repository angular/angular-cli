import {expectGlobFileSizeToBeUnder} from '../../utils/fs';
import {ng} from '../../utils/process';


export default async function() {
  await ng('build', '--prod');

  // Expect size of the main bundle AND the whole app to be within 1% of an "Hello World" project.
  await expectGlobFileSizeToBeUnder('dist/main.*.js', 152200 * 1.01);
  await expectGlobFileSizeToBeUnder('dist/*', 232000 * 1.01);
}
