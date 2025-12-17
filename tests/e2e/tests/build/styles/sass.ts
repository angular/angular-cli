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
    'src/styles.sass': `
      @import './imported-styles.sass'
      body
        background-color: blue
    `,
    'src/imported-styles.sass': `
      p
        background-color: red
    `,
    'src/app/app.sass': `
      .outer
        .inner
          background: #fff
      `,
  });

  await updateJsonFile('angular.json', (workspaceJson) => {
    const appArchitect = workspaceJson.projects['test-project'].architect;
    appArchitect.build.options.styles = [{ input: 'src/styles.sass' }];
  });

  await deleteFile('src/app/app.css');
  await replaceInFile('src/app/app.ts', './app.css', './app.sass');

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
