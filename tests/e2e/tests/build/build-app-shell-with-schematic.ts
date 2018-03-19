import { ng, npm } from '../../utils/process';
import { expectFileToMatch, appendToFile } from '../../utils/fs';
import { getGlobalVariable } from '../../utils/env';
import { expectToFail } from '../../utils/utils';
import { updateJsonFile } from '../../utils/project';
import { readNgVersion } from '../../utils/version';


export default function () {
  // Skip this in ejected tests.
  if (getGlobalVariable('argv').eject) {
    return Promise.resolve();
  }

  // Skip this test in Angular 2/4.
  if (getGlobalVariable('argv').ng2 || getGlobalVariable('argv').ng4) {
    return Promise.resolve();
  }

  let platformServerVersion = readNgVersion();

  if (getGlobalVariable('argv').nightly) {
    platformServerVersion = 'github:angular/platform-server-builds';
  }


  return Promise.resolve()
    .then(() => expectToFail(() => {
      return ng('generate', 'appShell', '--universal-app', 'universal');
    })
    .then(() => appendToFile('projects/test-project/src/app/app.component.html', '<router-outlet></router-outlet>'))
    .then(() => ng('generate', 'appShell', '--universal-app', 'universal'))
    .then(() => updateJsonFile('package.json', packageJson => {
      const dependencies = packageJson['dependencies'];
      dependencies['@angular/platform-server'] = platformServerVersion;
    })
    .then(() => npm('install'))
    .then(() => ng('build', '--optimization'))
    .then(() => expectFileToMatch('dist/test-project/index.html', /app-shell works!/))
    .then(() => ng('build', '--optimization', '--skip-app-shell'))
    .then(() => expectToFail(() => expectFileToMatch('dist/test-project/index.html', /app-shell works!/)));
}
