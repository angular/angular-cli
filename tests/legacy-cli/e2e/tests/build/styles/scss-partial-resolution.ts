import { installPackage } from '../../../utils/packages';
import { writeMultipleFiles, deleteFile, replaceInFile } from '../../../utils/fs';
import { ng } from '../../../utils/process';
import { updateJsonFile } from '../../../utils/project';

export default async function () {
  // Supports resolving node_modules with are pointing to partial files partial files.
  // @material/button/button below points to @material/button/_button.scss
  // https://unpkg.com/browse/@material/button@14.0.0/_button.scss

  await installPackage('@material/button@14.0.0');

  await writeMultipleFiles({
    'src/styles.scss': `
      @use '@material/button/button';

      @include button.core-styles;
    `,
    'src/app/app.scss': `
      @use '@material/button/button';

      @include button.core-styles;
    `,
  });

  await updateJsonFile('angular.json', (workspaceJson) => {
    const appArchitect = workspaceJson.projects['test-project'].architect;
    appArchitect.build.options.styles = ['src/styles.scss'];
  });

  await deleteFile('src/app/app.css');
  await replaceInFile('src/app/app.ts', './app.css', './app.scss');

  await ng('build', '--configuration=development');
}
