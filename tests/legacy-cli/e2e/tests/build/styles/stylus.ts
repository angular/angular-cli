import {
  writeMultipleFiles,
  deleteFile,
  expectFileToMatch,
  replaceInFile
} from '../../../utils/fs';
import { expectToFail } from '../../../utils/utils';
import { ng } from '../../../utils/process';
import { stripIndents } from 'common-tags';
import { updateJsonFile } from '../../../utils/project';

export default function () {
  // TODO(architect): Delete this test. It is now in devkit/build-angular.

  return writeMultipleFiles({
    'src/styles.styl': stripIndents`
      @import './imported-styles.styl';
      body { background-color: blue; }
    `,
    'src/imported-styles.styl': stripIndents`
      p { background-color: red; }
    `,
    'src/app/app.component.styl': stripIndents`
        .outer {
          .inner {
            background: #fff;
          }
        }
      `})
    .then(() => deleteFile('src/app/app.component.css'))
    .then(() => updateJsonFile('angular.json', workspaceJson => {
      const appArchitect = workspaceJson.projects['test-project'].architect;
      appArchitect.build.options.styles = [
        { input: 'src/styles.styl' },
      ];
    }))
    .then(() => replaceInFile('src/app/app.component.ts',
      './app.component.css', './app.component.styl'))
    .then(() => ng('build', '--extract-css', '--source-map'))
    .then(() => expectFileToMatch('dist/test-project/styles.css',
      /body\s*{\s*background-color: #00f;\s*}/))
    .then(() => expectFileToMatch('dist/test-project/styles.css',
      /p\s*{\s*background-color: #f00;\s*}/))
    .then(() => expectToFail(() => expectFileToMatch('dist/test-project/styles.css', '"mappings":""')))
    .then(() => expectFileToMatch('dist/test-project/main-es5.js', /.outer.*.inner.*background:\s*#[fF]+/));
    .then(() => expectFileToMatch('dist/test-project/main-es2015.js', /.outer.*.inner.*background:\s*#[fF]+/));
}
