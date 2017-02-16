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
  return writeMultipleFiles({
    'src/styles.scss': stripIndents`
      @import './imported-styles.scss';
      body { background-color: blue; }
    `,
    'src/imported-styles.scss': stripIndents`
      p { background-color: red; }
    `,
    'src/app/app.component.scss': stripIndents`
        .outer {
          .inner {
            background: #fff;
          }
        }
      `})
    .then(() => deleteFile('src/app/app.component.css'))
    .then(() => updateJsonFile('.angular-cli.json', configJson => {
      const app = configJson['apps'][0];
      app['styles'] = ['styles.scss'];
    }))
    .then(() => replaceInFile('src/app/app.component.ts',
      './app.component.css', './app.component.scss'))
    .then(() => ng('build', '--extract-css', '--sourcemap'))
    .then(() => expectFileToMatch('dist/styles.bundle.css',
      /body\s*{\s*background-color: blue;\s*}/))
    .then(() => expectFileToMatch('dist/styles.bundle.css',
      /p\s*{\s*background-color: red;\s*}/))
    .then(() => expectToFail(() => expectFileToMatch('dist/styles.bundle.css', '"mappings":""')))
    .then(() => expectFileToMatch('dist/main.bundle.js', /.outer.*.inner.*background:\s*#[fF]+/));
}
