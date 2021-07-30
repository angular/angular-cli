import { expectFileToMatch } from '../../utils/fs';
import { installPackage } from '../../utils/packages';
import { ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';

export default async function () {
  // Install material design icons
  await installPackage('material-design-icons@3.0.1');

  // Add icon stylesheet to application
  await updateJsonFile('angular.json', (workspaceJson) => {
    const appArchitect = workspaceJson.projects['test-project'].architect;
    appArchitect.build.options.styles = [
      { input: 'node_modules/material-design-icons/iconfont/material-icons.css' },
    ];
  });

  // Build dev application
  await ng('build', '--configuration=development');

  // Ensure icons are included
  await expectFileToMatch('dist/test-project/styles.css', 'Material Icons');

  // Build prod application
  await ng('build', '--output-hashing=none');

  // Ensure icons are included
  await expectFileToMatch('dist/test-project/styles.css', 'Material Icons');
}
