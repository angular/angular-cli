import {
  deleteFile,
  expectFileToMatch,
  replaceInFile,
  writeMultipleFiles,
} from '../../../utils/fs';
import { ng, silentExec, silentNpm } from '../../../utils/process';
import { updateJsonFile } from '../../../utils/project';
import { expectToFail } from '../../../utils/utils';


export default async function () {
  if (process.platform.startsWith('win')) {
    return;
  }

  await writeMultipleFiles({
    'src/styles.scss': '@import \'./imported-styles.scss\';\nbody { background-color: blue; }',
    'src/imported-styles.scss': 'p { background-color: red; }',
    'src/app/app.component.scss': '.outer { .inner { background: #fff; } }',
  });
  await deleteFile('src/app/app.component.css');
  await updateJsonFile('angular.json', workspaceJson => {
    const appArchitect = workspaceJson.projects['test-project'].architect;
    appArchitect.build.options.styles = [
      { input: 'src/styles.scss' },
    ];
  });
  await replaceInFile('src/app/app.component.ts', './app.component.css', './app.component.scss');

  await silentExec('rm', '-rf', 'node_modules/node-sass');
  await silentExec('rm', '-rf', 'node_modules/sass');
  await expectToFail(() => ng('build', '--extract-css', '--source-map'));

  await silentNpm('install', 'node-sass');
  await silentExec('rm', '-rf', 'node_modules/sass');
  await ng('build', '--extract-css', '--source-map');

  await expectFileToMatch('dist/test-project/styles.css', /body\s*{\s*background-color: blue;\s*}/);
  await expectFileToMatch('dist/test-project/styles.css', /p\s*{\s*background-color: red;\s*}/);
  await expectToFail(() => expectFileToMatch('dist/test-project/styles.css', '"mappings":""'));
  await expectFileToMatch('dist/test-project/main-es5.js', /.outer.*.inner.*background:\s*#[fF]+/);
  await expectFileToMatch('dist/test-project/main-es2015.js', /.outer.*.inner.*background:\s*#[fF]+/);

  await silentNpm('install', 'node-gyp');
  await silentNpm('install', 'fibers');
  await silentNpm('install', 'sass');
  await silentExec('rm', '-rf', 'node_modules/node-sass');
  await ng('build', '--extract-css', '--source-map');

  await expectFileToMatch('dist/test-project/styles.css', /body\s*{\s*background-color: blue;\s*}/);
  await expectFileToMatch('dist/test-project/styles.css', /p\s*{\s*background-color: red;\s*}/);
  await expectToFail(() => expectFileToMatch('dist/test-project/styles.css', '"mappings":""'));
  await expectFileToMatch('dist/test-project/main-es5.js', /.outer.*.inner.*background:\s*#[fF]+/);
  await expectFileToMatch('dist/test-project/main-es2015.js', /.outer.*.inner.*background:\s*#[fF]+/);
}
