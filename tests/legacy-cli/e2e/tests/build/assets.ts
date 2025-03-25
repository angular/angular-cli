import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import { expectFileToExist, expectFileToMatch, writeFile } from '../../utils/fs';
import { ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';
import { expectToFail } from '../../utils/utils';
import { getGlobalVariable } from '../../utils/env';

const isNodeV22orHigher = Number(process.versions.node.split('.', 1)[0]) >= 22;

export default async function () {
  await writeFile('public/.file', '');
  await writeFile('public/test.abc', 'hello world');

  const originalStats = fs.statSync('public/favicon.ico', { bigint: true });

  await ng('build', '--configuration=development');

  await expectFileToExist('dist/test-project/browser/favicon.ico');
  await expectFileToExist('dist/test-project/browser/.file');
  await expectFileToMatch('dist/test-project/browser/test.abc', 'hello world');
  await expectToFail(() => expectFileToExist('dist/test-project/browser/.gitkeep'));

  // Timestamp preservation only supported with application build system on Node.js v22+
  if (isNodeV22orHigher && getGlobalVariable('argv')['esbuild']) {
    const outputStats = fs.statSync('dist/test-project/browser/favicon.ico', { bigint: true });
    assert.equal(
      originalStats.mtimeMs,
      outputStats.mtimeMs,
      'Asset file modified timestamp should be preserved.',
    );
  }

  // Ensure `followSymlinks` option follows symlinks
  await updateJsonFile('angular.json', (workspaceJson) => {
    const appArchitect = workspaceJson.projects['test-project'].architect;
    appArchitect['build'].options.assets = [
      { glob: '**/*', input: 'public', followSymlinks: true },
    ];
  });
  fs.mkdirSync('dirToSymlink/subdir1', { recursive: true });
  fs.mkdirSync('dirToSymlink/subdir2/subsubdir1', { recursive: true });
  fs.writeFileSync('dirToSymlink/a.txt', '');
  fs.writeFileSync('dirToSymlink/subdir1/b.txt', '');
  fs.writeFileSync('dirToSymlink/subdir2/c.txt', '');
  fs.writeFileSync('dirToSymlink/subdir2/subsubdir1/d.txt', '');
  fs.symlinkSync(process.cwd() + '/dirToSymlink', 'public/symlinkDir');

  await ng('build', '--configuration=development');

  await expectFileToExist('dist/test-project/browser/symlinkDir/a.txt');
  await expectFileToExist('dist/test-project/browser/symlinkDir/subdir1/b.txt');
  await expectFileToExist('dist/test-project/browser/symlinkDir/subdir2/c.txt');
  await expectFileToExist('dist/test-project/browser/symlinkDir/subdir2/subsubdir1/d.txt');
}
