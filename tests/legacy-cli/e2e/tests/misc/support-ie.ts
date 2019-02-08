import { oneLineTrim } from 'common-tags';
import { expectFileNotToExist, expectFileToMatch } from '../../utils/fs';
import { ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';

export default async function () {
  await updateJsonFile('angular.json', workspaceJson => {
      const appArchitect = workspaceJson.projects['test-project'].architect;
      appArchitect.build.options.es5BrowserSupport = false;
  });

  await ng('build');
  await expectFileNotToExist('dist/test-project/es2015-polyfills.js');
  await expectFileToMatch('dist/test-project/index.html', oneLineTrim`
    <script src="runtime.js"></script>
    <script src="polyfills.js"></script>
    <script src="styles.js"></script>
    <script src="vendor.js"></script>
    <script src="main.js"></script>
  `);

  await ng('build', `--es5BrowserSupport`);
  await expectFileToMatch('dist/test-project/es2015-polyfills.js', 'core-js');
  await expectFileToMatch('dist/test-project/index.html', oneLineTrim`
    <script src="runtime.js"></script>
    <script src="es2015-polyfills.js" nomodule></script>
    <script src="polyfills.js"></script>
    <script src="styles.js"></script>
    <script src="vendor.js"></script>
    <script src="main.js"></script>
  `);
}
