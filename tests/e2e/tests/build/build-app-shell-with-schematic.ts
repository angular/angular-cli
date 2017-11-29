import { ng, npm } from '../../utils/process';
import { expectFileToMatch } from '../../utils/fs';
import { getGlobalVariable } from '../../utils/env';
import { expectToFail } from '../../utils/utils';


export default function () {
  // Skip this in ejected tests.
  if (getGlobalVariable('argv').eject) {
    return Promise.resolve();
  }

  // Skip this test in Angular 2/4.
  if (getGlobalVariable('argv').ng2 || getGlobalVariable('argv').ng4) {
    return Promise.resolve();
  }

  return Promise.resolve()
    .then(() => ng('generate', 'appShell', 'name', '--universal-app', 'universal'))
    .then(() => npm('install'))
    .then(() => ng('build', '--prod'))
    .then(() => expectFileToMatch('dist/index.html', /app-shell works!/))
    .then(() => ng('build', '--prod', '--skip-app-shell'))
    .then(() => expectToFail(() => expectFileToMatch('dist/index.html', /app-shell works!/)));
}
