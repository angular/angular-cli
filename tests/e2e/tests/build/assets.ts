import assert from 'node:assert/strict';
import { writeFile, stat, mkdir, symlink, utimes } from 'node:fs/promises';
import { expectFileToExist, expectFileToMatch } from '../../utils/fs';
import { ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';
import { expectToFail } from '../../utils/utils';
import { getGlobalVariable } from '../../utils/env';

const isNodeV22orHigher = Number(process.versions.node.split('.', 1)[0]) >= 22;

export default async function () {
  // Update the atime and mtime of the original file.
  // Note: Node.js has different time precision, which may cause mtime-based tests to fail.
  // Ensure both values are rounded to the same precision for consistency.
  // Example:
  // Original: '1742973507738.0234'
  // Node.js CP: '1742973507737.999'
  const { atime, mtime } = await stat('public/favicon.ico');
  await utimes('public/favicon.ico', atime, mtime);

  await writeFile('public/.file', '');
  await writeFile('public/test.abc', 'hello world');

  await ng('build', '--configuration=development');
  await expectFileToExist('dist/test-project/browser/favicon.ico');
  await expectFileToExist('dist/test-project/browser/.file');
  await expectFileToMatch('dist/test-project/browser/test.abc', 'hello world');
  await expectToFail(() => expectFileToExist('dist/test-project/browser/.gitkeep'));

  // Timestamp preservation only supported with application build system on Node.js v22+
  if (isNodeV22orHigher && getGlobalVariable('argv')['esbuild']) {
    const [originalStats, outputStats] = await Promise.all([
      stat('public/favicon.ico'),
      stat('dist/test-project/browser/favicon.ico'),
    ]);

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

  await mkdir('dirToSymlink/subdir1', { recursive: true });
  await mkdir('dirToSymlink/subdir2/subsubdir1', { recursive: true });
  await symlink(process.cwd() + '/dirToSymlink', 'public/symlinkDir');

  await Promise.all([
    writeFile('dirToSymlink/a.txt', ''),
    writeFile('dirToSymlink/subdir1/b.txt', ''),
    writeFile('dirToSymlink/subdir2/c.txt', ''),
    writeFile('dirToSymlink/subdir2/subsubdir1/d.txt', ''),
  ]);

  await ng('build', '--configuration=development');

  await expectFileToExist('dist/test-project/browser/symlinkDir/a.txt');
  await expectFileToExist('dist/test-project/browser/symlinkDir/subdir1/b.txt');
  await expectFileToExist('dist/test-project/browser/symlinkDir/subdir2/c.txt');
  await expectFileToExist('dist/test-project/browser/symlinkDir/subdir2/subsubdir1/d.txt');
}
