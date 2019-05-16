import {ng} from '../../../utils/process';
import {updateJsonFile} from '../../../utils/project';
import {expectToFail} from '../../../utils/utils';

export default function() {
  // TODO(architect): This isn't working correctly in devkit/build-angular, due to module resolution.
  return;

  return Promise.resolve()
    .then(() => updateJsonFile('angular.json', workspaceJson => {
      const appArchitect = workspaceJson.projects['test-project'].architect;
      appArchitect.build.options.outputPath = './';
    }))
    .then(() => expectToFail(() => ng('build')))
    .then(() => expectToFail(() => ng('serve')));
}
