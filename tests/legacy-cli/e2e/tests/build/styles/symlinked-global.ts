import { symlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { expectFileToMatch, writeMultipleFiles } from '../../../utils/fs';
import { ng } from '../../../utils/process';
import { updateJsonFile } from '../../../utils/project';

export default async function () {
  await writeMultipleFiles({
    'src/styles.scss': `p { color: red }`,
    'src/styles-for-link.scss': `p { color: blue }`,
  });

  symlinkSync(resolve('src/styles-for-link.scss'), resolve('src/styles-linked.scss'));

  await updateJsonFile('angular.json', (workspaceJson) => {
    const appArchitect = workspaceJson.projects['test-project'].architect;
    appArchitect.build.options.styles = ['src/styles.scss', 'src/styles-linked.scss'];
  });

  await ng('build', '--configuration=development');
  await expectFileToMatch('dist/test-project/browser/styles.css', 'red');
  await expectFileToMatch('dist/test-project/browser/styles.css', 'blue');

  await ng('build', '--preserve-symlinks', '--configuration=development');
  await expectFileToMatch('dist/test-project/browser/styles.css', 'red');
  await expectFileToMatch('dist/test-project/browser/styles.css', 'blue');
}
