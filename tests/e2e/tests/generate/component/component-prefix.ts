import {join} from 'path';
import {ng} from '../../../utils/process';
import {expectFileToMatch} from '../../../utils/fs';
import { updateJsonFile } from '../../../utils/project';


export default function() {
  const componentDir = join('src', 'app', 'test-component');

  return Promise.resolve()
    .then(() => updateJsonFile('.angular-cli.json', configJson => {
      const app = configJson['apps'][0];
      app['prefix'] = 'pre';
    }))
    .then(() => ng('generate', 'component', 'test-component'))
    .then(() => expectFileToMatch(join(componentDir, 'test-component.component.ts'),
      /selector: 'pre-/))
    .then(() => ng('g', 'c', 'alias'))
    .then(() => expectFileToMatch(join('src', 'app', 'alias', 'alias.component.ts'),
      /selector: 'pre-/))

    // Try to run the unit tests.
    .then(() => ng('test', '--single-run'));
}
