import { getGlobalVariable } from '../../../utils/env';
import { writeMultipleFiles, expectFileToMatch, replaceInFile, createDir } from '../../../utils/fs';
import { ng } from '../../../utils/process';
import { updateJsonFile } from '../../../utils/project';

export default async function () {
  // esbuild currently only supports Sass
  const esbuild = getGlobalVariable('argv')['esbuild'];

  await createDir('src/style-paths');
  await writeMultipleFiles({
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
      `,
  });

  await replaceInFile(
    'src/app/app.component.ts',
    `'./app.component.css\'`,
    `'./app.component.scss'` + (esbuild ? '' : `, './app.component.styl', './app.component.less'`),
  );

  await updateJsonFile('angular.json', (workspaceJson) => {
    const appArchitect = workspaceJson.projects['test-project'].architect;
    appArchitect.build.options.styles = [{ input: 'src/styles.scss' }];
    if (!esbuild) {
      appArchitect.build.options.styles.push(
        { input: 'src/styles.styl' },
        { input: 'src/styles.less' },
      );
    }
    appArchitect.build.options.stylePreprocessorOptions = {
      includePaths: ['src/style-paths'],
    };
  });

  await ng('build', '--configuration=development');
  await expectFileToMatch('dist/test-project/styles.css', /h1\s*{\s*color: red;\s*}/);
  await expectFileToMatch('dist/test-project/main.js', /h2.*{.*color: red;.*}/);
  if (!esbuild) {
    // These checks are for the less and stylus files
    await expectFileToMatch('dist/test-project/styles.css', /h3\s*{\s*color: #008000;\s*}/);
    await expectFileToMatch('dist/test-project/main.js', /h4.*{.*color: #008000;.*}/);
    await expectFileToMatch('dist/test-project/styles.css', /h5\s*{\s*color: #ADDADD;\s*}/);
    await expectFileToMatch('dist/test-project/main.js', /h6.*{.*color: #ADDADD;.*}/);
  }

  // esbuild currently only supports AOT and not JIT mode
  if (!esbuild) {
    await ng('build', '--no-aot', '--configuration=development');

    await expectFileToMatch('dist/test-project/styles.css', /h1\s*{\s*color: red;\s*}/);
    await expectFileToMatch('dist/test-project/main.js', /h2.*{.*color: red;.*}/);
    await expectFileToMatch('dist/test-project/styles.css', /h3\s*{\s*color: #008000;\s*}/);
    await expectFileToMatch('dist/test-project/main.js', /h4.*{.*color: #008000;.*}/);
    await expectFileToMatch('dist/test-project/styles.css', /h5\s*{\s*color: #ADDADD;\s*}/);
    await expectFileToMatch('dist/test-project/main.js', /h6.*{.*color: #ADDADD;.*}/);
  }
}
