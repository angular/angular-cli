import { join } from 'node:path';
import { ng } from '../../../utils/process';
import { expectFileToExist } from '../../../utils/fs';
import { updateJsonFile } from '../../../utils/project';
import { expectToFail } from '../../../utils/utils';

// tslint:disable:max-line-length
export default function () {
  const componentDir = join('src', 'app', 'test-component');
  return (
    Promise.resolve()
      .then(() =>
        updateJsonFile('angular.json', (configJson) => {
          configJson.projects['test-project'].schematics = {
            '@schematics/angular:component': { inlineTemplate: true },
          };
        }),
      )
      .then(() => ng('generate', 'component', 'test-component'))
      .then(() => expectFileToExist(componentDir))
      .then(() => expectFileToExist(join(componentDir, 'test-component.ts')))
      .then(() => expectFileToExist(join(componentDir, 'test-component.spec.ts')))
      .then(() => expectToFail(() => expectFileToExist(join(componentDir, 'test-component.html'))))
      .then(() => expectFileToExist(join(componentDir, 'test-component.css')))

      // Try to run the unit tests.
      .then(() => ng('test', '--watch=false'))
  );
}
