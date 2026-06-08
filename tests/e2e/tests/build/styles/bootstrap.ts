import { writeMultipleFiles } from '../../../utils/fs';
import { installPackage } from '../../../utils/packages';
import { ng } from '../../../utils/process';
import { updateJsonFile } from '../../../utils/project';

export default async function () {
  // Install bootstrap
  await installPackage('bootstrap@5');

  await writeMultipleFiles({
    'src/styles.scss': `
      @import 'bootstrap/scss/bootstrap';
    `,
  });

  await updateJsonFile('angular.json', (workspaceJson) => {
    const appArchitect = workspaceJson.projects['test-project'].architect;
    appArchitect.build.options.styles = [{ input: 'src/styles.scss' }];
  });

  await ng('build');
}
