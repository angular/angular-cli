import {expectFileToExist} from '../../utils/fs';
import {expectGitToBeClean} from '../../utils/git';
import {ng} from '../../utils/process';
import {updateJsonFile} from '../../utils/project';
import {expectToFail} from '../../utils/utils';


export default function() {
  // TODO(architect): Delete this test. It is now in devkit/build-angular.

  return ng('build', '--output-path', 'build-output')
    .then(() => expectFileToExist('./build-output/index.html'))
    .then(() => expectFileToExist('./build-output/main-es5.js'))
    .then(() => expectFileToExist('./build-output/main-es2015.js'))
    .then(() => expectToFail(expectGitToBeClean))
    .then(() => updateJsonFile('angular.json', workspaceJson => {
      const appArchitect = workspaceJson.projects['test-project'].architect;
      appArchitect.build.options.outputPath = 'config-build-output';
    }))
    .then(() => ng('build'))
    .then(() => expectFileToExist('./config-build-output/index.html'))
    .then(() => expectFileToExist('./config-build-output/main-es5.js'))
    .then(() => expectFileToExist('./config-build-output/main-es2015.js'))
    .then(() => expectToFail(expectGitToBeClean));
}
