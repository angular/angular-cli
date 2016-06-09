import {
  writeMultipleFiles,
  deleteFile,
  expectFileToMatch,
  moveFile,
  replaceInFile
} from '../../../utils/fs';
import { ng } from '../../../utils/process';
import { stripIndents } from 'common-tags';
import { isMobileTest, getAppMain } from '../../../utils/utils';


export default function () {
  if (isMobileTest()) {
    return;
  }

  return writeMultipleFiles({
    'src/app/app.component.less': stripIndents`
        .outer {
          .inner {
            background: #fff;
          }
        }
      `
  })
    .then(() => deleteFile('src/app/app.component.css'))
    .then(() => replaceInFile('src/app/app.component.ts',
      './app.component.css', './app.component.less'))
    .then(() => ng('build'))
    .then(() => expectFileToMatch(`dist/${getAppMain()}.bundle.js`,
      /.outer.*.inner.*background:\s*#[fF]+/))
    .then(() => moveFile('src/app/app.component.less', 'src/app/app.component.css'));
}
