import {join} from 'path';
import {ng} from '../../../utils/process';
import {expectFileToMatch} from '../../../utils/fs';
import { updateJsonFile } from '../../../utils/project';


export default function() {
  const testCompDir = join('src', 'app', 'test-component');
  const aliasCompDir = join('src', 'app', 'alias');

  return Promise.resolve()
    .then(() => updateJsonFile('angular.json', configJson => {
      configJson.projects['test-project'].schematics = {
        '@schematics/angular:component': { prefix: 'pre' }
      };
    }))
    .then(() => ng('generate', 'component', 'test-component'))
    .then(() => expectFileToMatch(join(testCompDir, 'test-component.component.ts'),
      /selector: 'pre-/))
    .then(() => ng('g', 'c', 'alias'))
    .then(() => expectFileToMatch(join(aliasCompDir, 'alias.component.ts'),
      /selector: 'pre-/))

    // Try to run the unit tests.
    .then(() => ng('test', '--watch=false'));
}
