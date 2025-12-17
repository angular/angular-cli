import {
  writeMultipleFiles,
  deleteFile,
  expectFileToMatch,
  replaceInFile,
} from '../../../utils/fs';
import { expectToFail } from '../../../utils/utils';
import { ng } from '../../../utils/process';
import { updateJsonFile } from '../../../utils/project';

export default async function () {
  await writeMultipleFiles({
    'src/styles.scss': `
      @import './imported-styles.scss';
      body { background-color: blue; }
    `,
    'src/imported-styles.scss': 'p { background-color: red; }',
    'src/app/app.scss': `
        .outer {
          .inner {
            background: #fff;
          }
        }
      `,
  });

  await updateJsonFile('angular.json', (workspaceJson) => {
    const appArchitect = workspaceJson.projects['test-project'].architect;
    appArchitect.build.options.styles = [{ input: 'src/styles.scss' }];
  });

  await deleteFile('src/app/app.css');
  await replaceInFile('src/app/app.ts', './app.css', './app.scss');

  await ng('build', '--source-map', '--configuration=development');

  await expectFileToMatch(
    'dist/test-project/browser/styles.css',
    /body\s*{\s*background-color: blue;\s*}/,
  );
  await expectFileToMatch(
    'dist/test-project/browser/styles.css',
    /p\s*{\s*background-color: red;\s*}/,
  );
  await expectToFail(() =>
    expectFileToMatch('dist/test-project/browser/styles.css', '"mappings":""'),
  );
  await expectFileToMatch(
    'dist/test-project/browser/main.js',
    /.outer.*.inner.*background:\s*#[fF]+/,
  );
}
