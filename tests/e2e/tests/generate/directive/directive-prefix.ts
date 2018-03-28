import {join} from 'path';
import {ng} from '../../../utils/process';
import {expectFileToMatch} from '../../../utils/fs';
import { updateJsonFile } from '../../../utils/project';


export default function() {
  const directiveDir = join('projects', 'test-project', 'src', 'app');

  return Promise.resolve()
    .then(() => updateJsonFile('angular.json', configJson => {
      configJson.projects['test-project'].schematics = {
        '@schematics/angular:directive': { prefix: 'pre' }
      };
    }))
    .then(() => ng('generate', 'directive', 'test-directive'))
    .then(() => expectFileToMatch(join(directiveDir, 'test-directive.directive.ts'),
      /selector: '\[pre/))

    // Try to run the unit tests.
    .then(() => ng('test', '--watch=false'));
}
