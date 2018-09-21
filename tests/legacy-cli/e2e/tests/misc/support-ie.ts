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
    <script type="text/javascript" src="runtime.js"></script>
    <script type="text/javascript" src="polyfills.js"></script>
    <script type="text/javascript" src="styles.js"></script>
    <script type="text/javascript" src="vendor.js"></script>
    <script type="text/javascript" src="main.js"></script>
  `);

  await ng('build', `--es5BrowserSupport`);
  await expectFileToMatch('dist/test-project/es2015-polyfills.js', 'core-js');
  await expectFileToMatch('dist/test-project/index.html', oneLineTrim`
    <script type="text/javascript" src="runtime.js"></script>
    <script type="text/javascript" src="es2015-polyfills.js" nomodule></script>
    <script type="text/javascript" src="polyfills.js"></script>
    <script type="text/javascript" src="styles.js"></script>
    <script type="text/javascript" src="vendor.js"></script>
    <script type="text/javascript" src="main.js"></script>
  `);
}
