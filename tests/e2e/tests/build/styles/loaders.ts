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
    .then(() => ng('build'))
    .then(() => expectToFail(() => expectFileToMatch('dist/styles.bundle.css', /exports/)))
    .then(() => expectToFail(() => expectFileToMatch('dist/main.bundle.js',
      /".*module\.exports.*\.outer.*background:/)));
}
