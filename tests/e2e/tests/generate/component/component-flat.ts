import {join} from 'path';
import {ng} from '../../../utils/process';
import {expectFileToExist} from '../../../utils/fs';
import {updateJsonFile} from '../../../utils/project';


export default function() {
  const appDir = join('src', 'app');
  return Promise.resolve()
    .then(() => updateJsonFile('angular.json', configJson => {
      configJson.projects['test-project'].schematics = {
        '@schematics/angular:component': { flat: true }
      };
    }))
    .then(() => ng('generate', 'component', 'test-component'))
    .then(() => expectFileToExist(appDir))
    .then(() => expectFileToExist(join(appDir, 'test-component.component.ts')))
    .then(() => expectFileToExist(join(appDir, 'test-component.component.spec.ts')))
    .then(() => expectFileToExist(join(appDir, 'test-component.component.html')))
    .then(() => expectFileToExist(join(appDir, 'test-component.component.css')))

    // Try to run the unit tests.
    .then(() => ng('test', '--watch=false'));
}
