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
    'src/app/app.component.scss': stripIndents`
        @import "app.component.partial";
        
        .outer {
          .inner {
            background: #def;
          }
        }
      `,
    'src/app/app.component.partial.scss': stripIndents`
        .partial {
          @extend .outer;
        }
      `
  })
    .then(() => deleteFile('src/app/app.component.css'))
    .then(() => replaceInFile('src/app/app.component.ts',
      './app.component.css', './app.component.scss'))
    .then(() => ng('build'))
    .then(() => expectFileToMatch(`dist/${getAppMain()}.bundle.js`,
      /\.outer.*\.inner.*background.*#def/))
    .then(() => expectFileToMatch(`dist/${getAppMain()}.bundle.js`,
      /\.partial.*\.inner.*background.*#def/))
    .then(() => moveFile('src/app/app.component.scss', 'src/app/app.component.css'));
}
