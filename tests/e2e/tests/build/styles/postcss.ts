import * as glob from 'glob';
import { writeFile, expectFileToMatch } from '../../../utils/fs';
import { ng } from '../../../utils/process';
import { getGlobalVariable } from '../../../utils/env';
import { stripIndents } from 'common-tags';

export default function () {
  // Skip this in Appveyor tests.
  if (getGlobalVariable('argv').appveyor) {
    return Promise.resolve();
  }

  return writeFile('src/styles.css', stripIndents`
      /* normal-comment */
      /*! important-comment */
      div { flex: 1 }
    `)
    // uses autoprefixer plugin for all builds
    .then(() => ng('build', '--extract-css'))
    .then(() => expectFileToMatch('dist/styles.bundle.css', stripIndents`
      /* normal-comment */
      /*! important-comment */
      div { -webkit-box-flex: 1; -ms-flex: 1; flex: 1 }
    `))
    // uses postcss-discard-comments plugin for prod
    .then(() => ng('build', '--prod'))
    .then(() => glob.sync('dist/styles.*.bundle.css').find(file => !!file))
    .then((stylesBundle) => expectFileToMatch(stylesBundle, stripIndents`
      /*! important-comment */div{-webkit-box-flex:1;-ms-flex:1;flex:1}
    `));
}
