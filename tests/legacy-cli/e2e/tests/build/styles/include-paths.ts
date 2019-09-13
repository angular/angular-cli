import {
  writeMultipleFiles,
  expectFileToMatch,
  replaceInFile,
  createDir
} from '../../../utils/fs';
import { ng } from '../../../utils/process';
import { updateJsonFile } from '../../../utils/project';

export default function () {
  return Promise.resolve()
    .then(() => createDir('src/style-paths'))
    .then(() => writeMultipleFiles({
      'src/style-paths/_variables.scss': '$primary-color: red;',
      'src/styles.scss': `
      @import 'variables';
      h1 { color: $primary-color; }
    `,
      'src/app/app.component.scss': `
      @import 'variables';
      h2 { background-color: $primary-color; }
    `,
      'src/style-paths/variables.styl': '$primary-color = green',
      'src/styles.styl': `
      @import 'variables'
      h3
        color: $primary-color
    `,
      'src/app/app.component.styl': `
      @import 'variables'
      h4
        background-color: $primary-color
    `,
      'src/style-paths/variables.less': '@primary-color: #ADDADD;',
      'src/styles.less': `
      @import 'variables';
      h5 { color: @primary-color; }
    `,
      'src/app/app.component.less': `
      @import 'variables';
      h6 { color: @primary-color; }
    `
    }))
    .then(() => replaceInFile('src/app/app.component.ts', `'./app.component.css\'`,
      `'./app.component.scss', './app.component.styl', './app.component.less'`))
    .then(() => updateJsonFile('angular.json', workspaceJson => {
      const appArchitect = workspaceJson.projects['test-project'].architect;
      appArchitect.build.options.styles = [
        { input: 'src/styles.scss' },
        { input: 'src/styles.styl' },
        { input: 'src/styles.less' },
      ];
      appArchitect.build.options.stylePreprocessorOptions = {
        includePaths: [
          'src/style-paths'
        ]
      };
    }))
    // files were created successfully
    .then(() => ng('build', '--extract-css'))
    .then(() => expectFileToMatch('dist/test-project/styles.css', /h1\s*{\s*color: red;\s*}/))
    .then(() => expectFileToMatch('dist/test-project/main-es2015.js', /h2.*{.*color: red;.*}/))
    .then(() => expectFileToMatch('dist/test-project/styles.css', /h3\s*{\s*color: #008000;\s*}/))
    .then(() => expectFileToMatch('dist/test-project/main-es2015.js', /h4.*{.*color: #008000;.*}/))
    .then(() => expectFileToMatch('dist/test-project/styles.css', /h5\s*{\s*color: #ADDADD;\s*}/))
    .then(() => expectFileToMatch('dist/test-project/main-es2015.js', /h6.*{.*color: #ADDADD;.*}/))
    .then(() => ng('build', '--extract-css', '--aot'))
    .then(() => expectFileToMatch('dist/test-project/styles.css', /h1\s*{\s*color: red;\s*}/))
    .then(() => expectFileToMatch('dist/test-project/main-es5.js', /h2.*{.*color: red;.*}/))
    .then(() => expectFileToMatch('dist/test-project/styles.css', /h3\s*{\s*color: #008000;\s*}/))
    .then(() => expectFileToMatch('dist/test-project/main-es5.js', /h4.*{.*color: #008000;.*}/))
    .then(() => expectFileToMatch('dist/test-project/styles.css', /h5\s*{\s*color: #ADDADD;\s*}/))
    .then(() => expectFileToMatch('dist/test-project/main-es5.js', /h6.*{.*color: #ADDADD;.*}/));
}
