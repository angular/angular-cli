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
    .then(() => updateJsonFile('.angular-cli.json', configJson => {
      const app = configJson['apps'][0];
      app['styles'] = [
        'styles.scss',
        'styles.styl',
        'styles.less'
      ];
      app['stylePreprocessorOptions'] = {
        includePaths: [
          'style-paths'
        ]
      };
    }))
    // files were created successfully
    .then(() => ng('build', '--extract-css'))
    .then(() => expectFileToMatch('dist/styles.bundle.css', /h1\s*{\s*color: red;\s*}/))
    .then(() => expectFileToMatch('dist/main.bundle.js', /h2.*{.*color: red;.*}/))
    .then(() => expectFileToMatch('dist/styles.bundle.css', /h3\s*{\s*color: #008000;\s*}/))
    .then(() => expectFileToMatch('dist/main.bundle.js', /h4.*{.*color: #008000;.*}/))
    .then(() => expectFileToMatch('dist/styles.bundle.css', /h5\s*{\s*color: #ADDADD;\s*}/))
    .then(() => expectFileToMatch('dist/main.bundle.js', /h6.*{.*color: #ADDADD;.*}/))
    .then(() => ng('build', '--extract-css', '--aot'))
    .then(() => expectFileToMatch('dist/styles.bundle.css', /h1\s*{\s*color: red;\s*}/))
    .then(() => expectFileToMatch('dist/main.bundle.js', /h2.*{.*color: red;.*}/))
    .then(() => expectFileToMatch('dist/styles.bundle.css', /h3\s*{\s*color: #008000;\s*}/))
    .then(() => expectFileToMatch('dist/main.bundle.js', /h4.*{.*color: #008000;.*}/))
    .then(() => expectFileToMatch('dist/styles.bundle.css', /h5\s*{\s*color: #ADDADD;\s*}/))
    .then(() => expectFileToMatch('dist/main.bundle.js', /h6.*{.*color: #ADDADD;.*}/));
}
