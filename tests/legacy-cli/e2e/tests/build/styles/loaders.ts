import {
  writeMultipleFiles,
  deleteFile,
  expectFileToMatch,
  replaceInFile,
} from '../../../utils/fs';
import { ng } from '../../../utils/process';
import { updateJsonFile } from '../../../utils/project';
import { expectToFail } from '../../../utils/utils';

export default async function () {
  await writeMultipleFiles({
    'src/styles.scss': `
      @import './imported-styles.scss';
      body { background-color: blue; }
    `,
    'src/imported-styles.scss': 'p { background-color: red; }',
    'src/app/app.component.scss': `
      .outer {
        .inner {
          background: #fff;
        }
      }
    `,
  });

  await deleteFile('src/app/app.component.css');
  await updateJsonFile('angular.json', (workspaceJson) => {
    const appArchitect = workspaceJson.projects['test-project'].architect;
    appArchitect.build.options.styles = [{ input: 'src/styles.scss' }];
  });
  await replaceInFile('src/app/app.component.ts', './app.component.css', './app.component.scss');

  await ng('build', '--configuration=development');

  await expectToFail(() => expectFileToMatch('dist/test-project/styles.css', /exports/));
  await expectToFail(() =>
    expectFileToMatch('dist/test-project/main.js', /".*module\.exports.*\.outer.*background:/),
  );
}
