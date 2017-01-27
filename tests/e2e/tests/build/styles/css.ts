import {
  writeMultipleFiles,
  expectFileToMatch,
} from '../../../utils/fs';
import { expectToFail } from '../../../utils/utils';
import { ng } from '../../../utils/process';
import { stripIndents } from 'common-tags';

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
    .then(() => ng('build', '--extract-css', '--sourcemap'))
    .then(() => expectFileToMatch('dist/styles.bundle.css',
      /body\s*{\s*background-color: blue;\s*}/))
    .then(() => expectFileToMatch('dist/styles.bundle.css',
      /p\s*{\s*background-color: red;\s*}/))
    .then(() => expectToFail(() => expectFileToMatch('dist/styles.bundle.css', '"mappings":""')))
    .then(() => expectFileToMatch('dist/main.bundle.js', /.outer.*.inner.*background:\s*#[fF]+/));
}
