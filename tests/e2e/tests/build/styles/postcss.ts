import * as glob from 'glob';
import { writeFile, expectFileToMatch } from '../../../utils/fs';
import { ng } from '../../../utils/process';
import { stripIndents } from 'common-tags';

export default function () {
    // TODO(architect): Delete this test. It is now in devkit/build-angular.

  return writeFile('projects/test-project/src/styles.css', stripIndents`
      /* normal-comment */
      /*! important-comment */
      div { flex: 1 }
    `)
    // uses autoprefixer plugin for all builds
    .then(() => ng('build', '--extract-css'))
    .then(() => expectFileToMatch('dist/test-project/styles.css', stripIndents`
      /* normal-comment */
      /*! important-comment */
      div { -ms-flex: 1; flex: 1 }
    `))
    // uses postcss-discard-comments plugin for prod
    .then(() => ng('build', '--prod'))
    .then(() => glob.sync('dist/test-project/styles.*.css').find(file => !!file))
    .then((stylesBundle) => expectFileToMatch(stylesBundle, stripIndents`
      /*! important-comment */div{-ms-flex:1;flex:1}
    `));
}
