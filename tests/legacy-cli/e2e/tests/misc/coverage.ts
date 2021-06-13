import {expectFileToExist, expectFileToMatch} from '../../utils/fs';
import {updateJsonFile} from '../../utils/project';
import {expectToFail} from '../../utils/utils';
import {ng} from '../../utils/process';


export default function () {
  // TODO(architect): This test is broken in devkit/build-angular, istanbul and
  // istanbul-instrumenter-loader are missing from the dependencies.
  return;

  return ng('test', '--watch=false', '--code-coverage')
    .then(output => expect(output.stdout).toContain('Coverage summary'))
    .then(() => expectFileToExist('coverage/src/app'))
    .then(() => expectFileToExist('coverage/lcov.info'))
    // Verify code coverage exclude work
    .then(() => expectFileToMatch('coverage/lcov.info', 'polyfills.ts'))
    .then(() => expectFileToMatch('coverage/lcov.info', 'test.ts'))
    .then(() => updateJsonFile('angular.json', workspaceJson => {
      const appArchitect = workspaceJson.projects['test-project'].architect;
      appArchitect.test.options.codeCoverageExclude = [
        'src/polyfills.ts',
        '**/test.ts',
      ];
    }))
    .then(() => ng('test', '--watch=false', '--code-coverage'))
    .then(() => expectToFail(() => expectFileToMatch('coverage/lcov.info', 'polyfills.ts')))
    .then(() => expectToFail(() => expectFileToMatch('coverage/lcov.info', 'test.ts')));
}
