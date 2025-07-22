import assert from 'node:assert/strict';
import { expectFileToMatch, writeMultipleFiles } from '../../utils/fs';
import { ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';

export default async function () {
  await writeMultipleFiles({
    'src/string-style.css': '.string-style { color: red }',
    'src/input-style.css': '.input-style { color: red }',
    'src/lazy-style.css': '.lazy-style { color: red }',
    'src/pre-rename-style.css': '.pre-rename-style { color: red }',
    'src/pre-rename-lazy-style.css': '.pre-rename-lazy-style { color: red }',
  });

  await updateJsonFile('angular.json', (workspaceJson) => {
    const appArchitect = workspaceJson.projects['test-project'].architect;
    appArchitect.build.options.styles = [
      { input: 'src/string-style.css' },
      { input: 'src/input-style.css' },
      { input: 'src/lazy-style.css', inject: false },
      { input: 'src/pre-rename-style.css', bundleName: 'renamed-style' },
      {
        input: 'src/pre-rename-lazy-style.css',
        bundleName: 'renamed-lazy-style',
        inject: false,
      },
    ];
  });

  const { stdout } = await ng('build', '--configuration=development');

  await expectFileToMatch('dist/test-project/browser/styles.css', '.string-style');
  await expectFileToMatch('dist/test-project/browser/styles.css', '.input-style');
  await expectFileToMatch('dist/test-project/browser/lazy-style.css', '.lazy-style');
  await expectFileToMatch('dist/test-project/browser/renamed-style.css', '.pre-rename-style');
  await expectFileToMatch(
    'dist/test-project/browser/renamed-lazy-style.css',
    '.pre-rename-lazy-style',
  );
  await expectFileToMatch(
    'dist/test-project/browser/index.html',
    '<link rel="stylesheet" href="styles.css"><link rel="stylesheet" href="renamed-style.css">',
  );

  // Non injected styles should be listed under lazy chunk files
  assert.match(stdout, /Lazy chunk files[\s\S]+renamed-lazy-style\.css/m);
}
