import * as glob from 'glob';
import { writeFile, expectFileToMatch } from '../../../utils/fs';
import { ng } from '../../../utils/process';
import { stripIndents } from 'common-tags';

export default function () {
    // TODO(architect): Delete this test. It is now in devkit/build-webpack.

  return writeFile('src/styles.css', stripIndents`
      /* normal-comment */
      /*! important-comment */
      div { flex: 1 }
    `)
    // uses autoprefixer plugin for all builds
    .then(() => ng('build', '--extract-css'))
    .then(() => expectFileToMatch('dist/styles.css', stripIndents`
      /* normal-comment */
      /*! important-comment */
      div { -webkit-box-flex: 1; -ms-flex: 1; flex: 1 }
    `))
    // uses postcss-discard-comments plugin for prod
    .then(() => ng('build', '--prod'))
    .then(() => glob.sync('dist/styles.*.css').find(file => !!file))
    .then((stylesBundle) => expectFileToMatch(stylesBundle, stripIndents`
      /*! important-comment */div{-webkit-box-flex:1;-ms-flex:1;flex:1}
    `));
}
