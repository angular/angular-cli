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
    appArchitect['options'] = {
      outputPath: 'dist/latest-project',
      index: 'src/index.html',
      main: 'src/main.ts',
      polyfills: 'src/polyfills.ts',
      tsConfig: 'tsconfig.app.json',
      assets: [
        'src/favicon.ico',
        'src/assets',
      ],
      'styles': [
        'src/styles.css',
      ],
      'scripts': [],
    };
    const browserConfigs = appArchitect['build'].configurations;
    browserConfigs['production'] = {
      extractCss: true,
    };
    browserConfigs['one'] = {
      assets: [],
    };
    browserConfigs['two'] = {
      sourceMap: false,
    };
    browserConfigs['three'] = {
      extractCss: false, // Defaults to false when not set.
    };
  });

  // Test the base configuration.
  await ng('build');
  await expectFileToExist('dist/test-project/favicon.ico');
  await expectFileToExist('dist/test-project/main-es2015.js.map');
  await expectFileToExist('dist/test-project/styles-es2015.js');
  await expectFileToExist('dist/test-project/vendor-es2015.js');
  // Test that --prod extracts css.
  await ng('build', '--prod');
  await expectFileToExist('dist/test-project/styles.css');
  // But using a config overrides prod.
  await ng('build', '--prod', '--configuration=three');
  await expectFileToExist('dist/test-project/styles-es2015.js');
  await expectToFail(() => expectFileToExist('dist/test-project/styles.css'));
  // Use two configurations.
  await ng('build', '--configuration=one,two', '--vendor-chunk=false');
  await expectToFail(() => expectFileToExist('dist/test-project/favicon.ico'));
  await expectToFail(() => expectFileToExist('dist/test-project/main-es2015.js.map'));
  // Use two configurations and two overrides, one of which overrides a config.
  await ng('build', '--configuration=one,two', '--vendor-chunk=false', '--sourceMap=true');
  await expectToFail(() => expectFileToExist('dist/test-project/favicon.ico'));
  await expectFileToExist('dist/test-project/main-es2015.js.map');
  await expectToFail(() => expectFileToExist('dist/test-project/vendor-es2015.js'));
  // Use three configurations and a override, and prod at the end.
  await ng('build', '--configuration=one,two,three', '--vendor-chunk=false', '--prod');
  await expectToFail(() => expectFileToExist('dist/test-project/favicon.ico'));
  await expectToFail(() => expectFileToExist('dist/test-project/main-es2015.js.map'));
  await expectToFail(() => expectFileToExist('dist/test-project/vendor-es2015.js'));
  await expectFileToExist('dist/test-project/styles-es2015.js');
  await expectToFail(() => expectFileToExist('dist/test-project/styles.css'));
}
