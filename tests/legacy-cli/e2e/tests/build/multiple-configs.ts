import { expectFileToExist } from '../../utils/fs';
import { ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';
import { expectToFail } from '../../utils/utils';

export default async function () {
  await updateJsonFile('angular.json', (workspaceJson) => {
    const appArchitect = workspaceJson.projects['test-project'].architect;
    // These are the default options, that we'll overwrite in subsequent configs.
    // sourceMap defaults to true
    appArchitect['build'] = {
      ...appArchitect['build'],
      defaultConfiguration: undefined,
      options: {
        ...appArchitect['build'].options,
        buildOptimizer: false,
        optimization: false,
        sourceMap: true,
        outputHashing: 'none',
        vendorChunk: true,
        assets: ['src/favicon.ico', 'src/assets'],
        styles: ['src/styles.css'],
        scripts: [],
        budgets: [],
      },
      configurations: {
        development: {
          sourceMap: true,
        },
        one: {
          assets: [],
        },
        two: {
          sourceMap: false,
        },
      },
    };

    return workspaceJson;
  });

  // Test the base configuration.
  await ng('build', '--configuration=development');
  await expectFileToExist('dist/test-project/favicon.ico');
  await expectFileToExist('dist/test-project/main.js.map');
  await expectFileToExist('dist/test-project/vendor.js');
  await ng('build');
  await expectFileToExist('dist/test-project/styles.css');
  // Use two configurations.
  await ng('build', '--configuration=one,two', '--vendor-chunk=false');
  await expectToFail(() => expectFileToExist('dist/test-project/favicon.ico'));
  await expectToFail(() => expectFileToExist('dist/test-project/main.js.map'));
  // Use two configurations and two overrides, one of which overrides a config.
  await ng('build', '--configuration=one,two', '--vendor-chunk=false', '--source-map=true');
  await expectToFail(() => expectFileToExist('dist/test-project/favicon.ico'));
  await expectFileToExist('dist/test-project/main.js.map');
  await expectToFail(() => expectFileToExist('dist/test-project/vendor.js'));
}
