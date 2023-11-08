import { writeMultipleFiles, expectFileToMatch, replaceInFile, createDir } from '../../../utils/fs';
import { ng } from '../../../utils/process';
import { updateJsonFile } from '../../../utils/project';

export default async function () {
  await createDir('src/style-paths');
  await writeMultipleFiles({
    'src/style-paths/_variables.scss': '$primary-color: red;',
    'src/styles.scss': `
      @import 'variables';
      h1 { color: $primary-color; }
      `,
    'src/app/app.component.scss': `
      @import 'variables';
      h2 { color: $primary-color; }
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
    `styleUrl: './app.component.css\'`,
    `styleUrls: ['./app.component.scss', './app.component.less']`,
  );

  await updateJsonFile('angular.json', (workspaceJson) => {
    const appArchitect = workspaceJson.projects['test-project'].architect;
    appArchitect.build.options.styles = [
      { input: 'src/styles.scss' },
      { input: 'src/styles.less' },
    ];
    appArchitect.build.options.stylePreprocessorOptions = {
      includePaths: ['src/style-paths'],
    };
  });

  await ng('build', '--configuration=development');
  await expectFileToMatch('dist/test-project/browser/styles.css', /h1\s*{\s*color: red;\s*}/);
  await expectFileToMatch('dist/test-project/browser/main.js', /h2.*{.*color: red;.*}/);
  // These checks are for the less files
  await expectFileToMatch('dist/test-project/browser/styles.css', /h5\s*{\s*color: #ADDADD;\s*}/);
  await expectFileToMatch('dist/test-project/browser/main.js', /h6.*{.*color: #ADDADD;.*}/);

  await ng('build', '--no-aot', '--configuration=development');
  await expectFileToMatch('dist/test-project/browser/styles.css', /h1\s*{\s*color: red;\s*}/);
  await expectFileToMatch('dist/test-project/browser/main.js', /h2.*{[\S\s]*color: red;[\S\s]*}/);
  await expectFileToMatch('dist/test-project/browser/styles.css', /h5\s*{\s*color: #ADDADD;\s*}/);
  await expectFileToMatch(
    'dist/test-project/browser/main.js',
    /h6.*{[\S\s]*color: #ADDADD;[\S\s]*}/,
  );
}
