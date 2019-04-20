import {
  writeMultipleFiles,
  expectFileToMatch,
  replaceInFile
} from '../../../utils/fs';
import { expectToFail } from '../../../utils/utils';
import { ng } from '../../../utils/process';
import { stripIndents } from 'common-tags';
import { updateJsonFile } from '../../../utils/project';
import { getGlobalVariable } from '../../../utils/env';

export default function () {
  // TODO(architect): Delete this test. It is now in devkit/build-angular.

  const extensions = ['css', 'scss', 'less', 'styl'];
  let promise = Promise.resolve();

  extensions.forEach(ext => {
    promise = promise.then(() => {
      return writeMultipleFiles({
        [`src/styles.${ext}`]: stripIndents`
          @import './imported-styles.${ext}';
          body { background-color: #00f; }
        `,
        [`src/imported-styles.${ext}`]: stripIndents`
          p { background-color: #f00; }
        `,
        [`src/app/app.component.${ext}`]: stripIndents`
          @import './imported-component-styles.${ext}';
          .outer {
            .inner {
              background: #fff;
            }
          }
        `,
        [`src/app/imported-component-styles.${ext}`]: stripIndents`
          h1 { background: #000; }
        `})
        // change files to use preprocessor
        .then(() => updateJsonFile('angular.json', workspaceJson => {
          const appArchitect = workspaceJson.projects['test-project'].architect;
          appArchitect.build.options.styles = [
            { input: `src/styles.${ext}` },
          ];
        }))
        .then(() => replaceInFile('src/app/app.component.ts',
          './app.component.css', `./app.component.${ext}`))
        // run build app
        .then(() => ng('build', '--extract-css', '--source-map'))
        // verify global styles
        .then(() => expectFileToMatch('dist/test-project/styles.css',
          /body\s*{\s*background-color: #00f;\s*}/))
        .then(() => expectFileToMatch('dist/test-project/styles.css',
          /p\s*{\s*background-color: #f00;\s*}/))
        // verify global styles sourcemap
        .then(() => expectToFail(() =>
          expectFileToMatch('dist/test-project/styles.css', '"mappings":""')))
        // verify component styles
        .then(() => expectFileToMatch('dist/test-project/main-es5.js',
          /.outer.*.inner.*background:\s*#[fF]+/))
        .then(() => expectFileToMatch('dist/test-project/main-es5.js',
          /h1.*background:\s*#000+/))
        // Also check imports work on ng test
        .then(() => ng('test', '--watch=false'))
        .then(() => updateJsonFile('angular.json', workspaceJson => {
          const appArchitect = workspaceJson.projects['test-project'].architect;
          appArchitect.build.options.styles = [
            { input: `src/styles.css` },
          ];
        }))
        .then(() => replaceInFile('src/app/app.component.ts',
          `./app.component.${ext}`, './app.component.css'));
    });
  });

  return promise;
}
