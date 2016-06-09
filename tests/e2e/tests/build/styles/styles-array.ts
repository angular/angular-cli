import * as glob from 'glob';

import { writeMultipleFiles, expectFileToMatch } from '../../../utils/fs';
import { ng } from '../../../utils/process';
import { updateJsonFile } from '../../../utils/project';


export default function () {
  return writeMultipleFiles({
    'src/styles.css': `
      @import './imported-styles.css';

      body { background-color: blue; }

      div { flex: 1 }
    `,
    'src/imported-styles.css': `
      p { background-color: red; }
    `,
    'src/styles.less': `
        .outer {
          .inner {
            background: #fff;
          }
        }
    `,
    'src/styles.scss': `
        .upper {
          .lower {
            background: #def;
          }
        }
    `
  })
    .then(() => updateJsonFile('angular-cli.json', configJson => {
      const app = configJson['apps'][0];
      app['styles'].push('styles.less');
      app['styles'].push('styles.scss');
    }))
    .then(() => ng('build'))
    .then(() => expectFileToMatch('dist/styles.bundle.js', 'body { background-color: blue; }'))
    .then(() => expectFileToMatch('dist/styles.bundle.js', 'p { background-color: red; }'))
    .then(() => expectFileToMatch(
      'dist/styles.bundle.js',
      'div { -webkit-box-flex: 1; -ms-flex: 1; flex: 1 }'))
    .then(() => expectFileToMatch('dist/styles.bundle.js', /.outer.*.inner.*background:\s*#[fF]+/))
    .then(() => expectFileToMatch('dist/styles.bundle.js', /.upper.*.lower.*background.*#def/))

    .then(() => ng('build', '--prod'))
    .then(() => glob.sync('dist/styles.*.bundle.css').find(file => !!file))
    .then((styles) =>
      expectFileToMatch(styles, /body\s*\{\s*background-color:\s*blue\s*\}/)
        .then(() => expectFileToMatch(styles, /p\s*\{\s*background-color:\s*red\s*\}/)
          .then(() => expectFileToMatch(styles, /.outer.*.inner.*background:\s*#[fF]+/))
          .then(() => expectFileToMatch(styles, /.upper.*.lower.*background.*#def/)))
    );
}
