import {join} from 'path';
import {ng} from '../../../utils/process';
import {expectFileToExist} from '../../../utils/fs';
import {updateJsonFile} from '../../../utils/project';


export default function() {
  const componentDir = join('src', 'app', 'test-component');

  return Promise.resolve()
    .then(() => updateJsonFile('angular.json', configJson => {
      configJson.projects['test-project'].schematics = {
        '@schematics/angular:component': { flat: false }
      };
    }))
    .then(() => ng('generate', 'component', 'test-component'))
    .then(() => expectFileToExist(componentDir))
    .then(() => expectFileToExist(join(componentDir, 'test-component.component.ts')))
    .then(() => expectFileToExist(join(componentDir, 'test-component.component.spec.ts')))
    .then(() => expectFileToExist(join(componentDir, 'test-component.component.html')))
    .then(() => expectFileToExist(join(componentDir, 'test-component.component.css')))

    // Try to run the unit tests.
    .then(() => ng('test', '--watch=false'));
}
