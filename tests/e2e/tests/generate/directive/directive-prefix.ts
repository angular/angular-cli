import {join} from 'path';
import {ng} from '../../../utils/process';
import {expectFileToMatch} from '../../../utils/fs';
import { updateJsonFile } from '../../../utils/project';


export default function() {
  const directiveDir = join('src', 'app');

  return Promise.resolve()
    .then(() => updateJsonFile('.angular-cli.json', configJson => {
      const app = configJson['apps'][0];
      app['prefix'] = 'pre';
    }))
    .then(() => ng('generate', 'directive', 'test-directive'))
    .then(() => expectFileToMatch(join(directiveDir, 'test-directive.directive.ts'),
      /selector: '\[pre/))

    // Try to run the unit tests.
    .then(() => ng('test', '--watch=false'));
}
