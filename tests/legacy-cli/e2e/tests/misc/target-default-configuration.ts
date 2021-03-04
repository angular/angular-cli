import { expectFileToExist } from '../../utils/fs';
import { ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';
import { expectToFail } from '../../utils/utils';

export default async function () {
  await updateJsonFile('angular.json', workspace => {
    const build = workspace.projects['test-project'].architect.build;
    build.defaultConfiguration = undefined;
    build.options = {
      ...build.options,
      optimization: false,
      buildOptimizer: false,
      outputHashing: 'none',
      sourceMap: true,
    };
  });

  await ng('build');
  await expectFileToExist('dist/test-project/main.js');
  await expectFileToExist('dist/test-project/main.js.map');

  // Add new configuration and set "defaultConfiguration"
  await updateJsonFile('angular.json', workspace => {
    const build = workspace.projects['test-project'].architect.build;
    build.defaultConfiguration = 'defaultConfiguration';
    build.configurations.defaultConfiguration = {
      sourceMap: false,
    };
  });

  await ng('build');
  await expectFileToExist('dist/test-project/main.js');
  await expectToFail(() => expectFileToExist('dist/test-project/main.js.map'));
}
