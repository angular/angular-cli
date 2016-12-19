import {
  writeMultipleFiles,
  expectFileToMatch,
} from '../../../utils/fs';
import { ng } from '../../../utils/process';
import { stripIndents } from 'common-tags';
import { getClientDist, getAppMain } from '../../../utils/utils';

export default function () {
  return writeMultipleFiles({
    'src/styles.css': stripIndents`
      @import './imported-styles.css';
      body { background-color: blue; }
    `,
    'src/imported-styles.css': stripIndents`
      p { background-color: red; }
    `,
    'src/app/app.component.css': stripIndents`
      .outer {
        .inner {
          background: #fff;
        }
      }
    `})
    .then(() => ng('build'))
    .then(() => expectFileToMatch(`${getClientDist()}styles.bundle.css`,
      /body\s*{\s*background-color: blue;\s*}/))
    .then(() => expectFileToMatch(`${getClientDist()}styles.bundle.css`,
      /p\s*{\s*background-color: red;\s*}/))
    .then(() => expectFileToMatch(`${getClientDist()}${getAppMain()}.bundle.js`,
      /.outer.*.inner.*background:\s*#[fF]+/));
}
