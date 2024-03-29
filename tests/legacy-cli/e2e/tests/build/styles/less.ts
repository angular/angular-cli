import {
  writeMultipleFiles,
  deleteFile,
  expectFileToMatch,
  replaceInFile,
} from '../../../utils/fs';
import { expectToFail } from '../../../utils/utils';
import { ng } from '../../../utils/process';
import { updateJsonFile } from '../../../utils/project';

export default function () {
  // TODO(architect): Delete this test. It is now in devkit/build-angular.

  return writeMultipleFiles({
    'src/styles.less': `
      @import './imported-styles.less';
      body { background-color: blue; }
    `,
    'src/imported-styles.less': 'p { background-color: red; }',
    'src/app/app.component.less': `
        .outer {
          .inner {
            background: #fff;
          }
        }
      `,
  })
    .then(() => deleteFile('src/app/app.component.css'))
    .then(() =>
      updateJsonFile('angular.json', (workspaceJson) => {
        const appArchitect = workspaceJson.projects['test-project'].architect;
        appArchitect.build.options.styles = [{ input: 'src/styles.less' }];
      }),
    )
    .then(() =>
      replaceInFile('src/app/app.component.ts', './app.component.css', './app.component.less'),
    )
    .then(() => ng('build', '--source-map', '--configuration=development'))
    .then(() =>
      expectFileToMatch(
        'dist/test-project/browser/styles.css',
        /body\s*{\s*background-color: blue;\s*}/,
      ),
    )
    .then(() =>
      expectFileToMatch(
        'dist/test-project/browser/styles.css',
        /p\s*{\s*background-color: red;\s*}/,
      ),
    )
    .then(() =>
      expectToFail(() =>
        expectFileToMatch('dist/test-project/browser/styles.css', '"mappings":""'),
      ),
    )
    .then(() =>
      expectFileToMatch(
        'dist/test-project/browser/main.js',
        /.outer.*.inner.*background:\s*#[fF]+/,
      ),
    );
}
