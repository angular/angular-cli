import { expectFileToExist } from '../../utils/fs';
import { ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';
import { expectToFail } from '../../utils/utils';

export default async function () {
  await updateJsonFile('angular.json', workspaceJson => {
    const appArchitect = workspaceJson.projects['test-project'].architect;
    // These are the default options, that we'll overwrite in subsequent configs.
    // extractCss defaults to false
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
        assets: [
          'src/favicon.ico',
          'src/assets',
        ],
        styles: [
          'src/styles.css',
        ],
        scripts: [],
        budgets: [],
      },
      configurations: {
        development: {
          sourceMap: true,
          extractCss: false,
        },
        one: {
          assets: [],
        },
        two: {
          sourceMap: false,
        },
        three: {
          extractCss: false, // Defaults to false when not set.
        },
      },
    };

    return workspaceJson;
  });

  // Test the base configuration.
  await ng('build', '--configuration=development');
  await expectFileToExist('dist/test-project/favicon.ico');
  await expectFileToExist('dist/test-project/main.js.map');
  await expectFileToExist('dist/test-project/styles.js');
  await expectFileToExist('dist/test-project/vendor.js');
  await ng('build');
  await expectFileToExist('dist/test-project/styles.css');
  // But using a config overrides prod.
  await ng('build', '--configuration=three');
  await expectFileToExist('dist/test-project/styles.js');
  await expectToFail(() => expectFileToExist('dist/test-project/styles.css'));
  // Use two configurations.
  await ng('build', '--configuration=one,two', '--vendor-chunk=false');
  await expectToFail(() => expectFileToExist('dist/test-project/favicon.ico'));
  await expectToFail(() => expectFileToExist('dist/test-project/main.js.map'));
  // Use two configurations and two overrides, one of which overrides a config.
  await ng('build', '--configuration=one,two', '--vendor-chunk=false', '--sourceMap=true');
  await expectToFail(() => expectFileToExist('dist/test-project/favicon.ico'));
  await expectFileToExist('dist/test-project/main.js.map');
  await expectToFail(() => expectFileToExist('dist/test-project/vendor.js'));
  // Use three configuration and check that last on value wins
  await ng('build', '--configuration=one,two,three', '--vendor-chunk=false');
  await expectToFail(() => expectFileToExist('dist/test-project/favicon.ico'));
  await expectToFail(() => expectFileToExist('dist/test-project/main.js.map'));
  await expectToFail(() => expectFileToExist('dist/test-project/vendor.js'));
  await expectFileToExist('dist/test-project/styles.js');
  await expectToFail(() => expectFileToExist('dist/test-project/styles.css'));
}
