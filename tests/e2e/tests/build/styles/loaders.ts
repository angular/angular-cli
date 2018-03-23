import {
  writeMultipleFiles,
  deleteFile,
  expectFileToMatch,
  replaceInFile
} from '../../../utils/fs';
import { ng } from '../../../utils/process';
import { stripIndents } from 'common-tags';
import { updateJsonFile } from '../../../utils/project';
import { expectToFail } from '../../../utils/utils';

export default function () {
  return writeMultipleFiles({
    'projects/test-project/src/styles.scss': stripIndents`
      @import './imported-styles.scss';
      body { background-color: blue; }
    `,
    'projects/test-project/src/imported-styles.scss': stripIndents`
      p { background-color: red; }
    `,
    'projects/test-project/src/app/app.component.scss': stripIndents`
        .outer {
          .inner {
            background: #fff;
          }
        }
      `})
    .then(() => deleteFile('projects/test-project/src/app/app.component.css'))
    .then(() => updateJsonFile('angular.json', workspaceJson => {
      const appArchitect = workspaceJson.projects['test-project'].architect;
      appArchitect.build.options.styles = [
        { input: 'projects/test-project/src/styles.scss' }
      ];
    }))
    .then(() => replaceInFile('projects/test-project/src/app/app.component.ts',
      './app.component.css', './app.component.scss'))
    .then(() => ng('build'))
    .then(() => expectToFail(() => expectFileToMatch('dist/test-project/styles.css', /exports/)))
    .then(() => expectToFail(() => expectFileToMatch('dist/test-project/main.js',
      /".*module\.exports.*\.outer.*background:/)));
}
