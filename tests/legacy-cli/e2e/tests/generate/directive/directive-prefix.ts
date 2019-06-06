import {join} from 'path';
import {ng} from '../../../utils/process';
import {expectFileToMatch} from '../../../utils/fs';
import { updateJsonFile, useCIChrome, useCIDefaults } from '../../../utils/project';


export default function() {
  const directiveDir = join('src', 'app');

  return Promise.resolve()
    .then(() => updateJsonFile('angular.json', configJson => {
      configJson.schematics = {
        '@schematics/angular:directive': { prefix: 'preW' }
      };
    }))
    .then(() => ng('generate', 'directive', 'test2-directive'))
    .then(() => expectFileToMatch(join(directiveDir, 'test2-directive.directive.ts'),
      /selector: '\[preW/))
    .then(() => ng('generate', 'application', 'app-two', '--skip-install'))
    .then(() => useCIDefaults('app-two'))
    .then(() => useCIChrome('./projects/app-two'))
    .then(() => updateJsonFile('angular.json', configJson => {
      configJson.projects['test-project'].schematics = {
        '@schematics/angular:directive': { prefix: 'preP' }
      };
    }))
    .then(() => process.chdir('projects/app-two'))
    .then(() => ng('generate', 'directive', '--skip-import', 'test3-directive'))
    .then(() => process.chdir('../..'))
    .then(() => expectFileToMatch(join('projects', 'app-two', 'test3-directive.directive.ts'),
      /selector: '\[preW/))
    .then(() => process.chdir('src/app'))
    .then(() => ng('generate', 'directive', 'test-directive'))
    .then(() => process.chdir('../..'))
    .then(() => expectFileToMatch(join(directiveDir, 'test-directive.directive.ts'),
      /selector: '\[preP/))

    // Try to run the unit tests.
    .then(() => ng('test', '--watch=false'));
}
