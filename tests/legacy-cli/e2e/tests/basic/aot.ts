import { expectFileToMatch } from '../../utils/fs';
import { ng } from '../../utils/process';

export default async function () {
  await ng('build', '--aot=true', '--configuration=development');
  await expectFileToMatch('dist/test-project/browser/main.js', 'AppComponent_Factory');
}
