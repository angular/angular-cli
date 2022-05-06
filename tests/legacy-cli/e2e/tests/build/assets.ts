import * as fs from 'fs';
import { expectFileToExist, expectFileToMatch, writeFile } from '../../utils/fs';
import { ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';
import { expectToFail } from '../../utils/utils';

export default async function () {
  await writeFile('src/assets/.file', '');
  await writeFile('src/assets/test.abc', 'hello world');

  await ng('build', '--configuration=development');

  await expectFileToExist('dist/test-project/favicon.ico');
  await expectFileToExist('dist/test-project/assets/.file');
  await expectFileToMatch('dist/test-project/assets/test.abc', 'hello world');
  await expectToFail(() => expectFileToExist('dist/test-project/assets/.gitkeep'));

  // Ensure `followSymlinks` option follows symlinks
  await updateJsonFile('angular.json', (workspaceJson) => {
    const appArchitect = workspaceJson.projects['test-project'].architect;
    appArchitect['build'].options.assets = [
      { glob: '**/*', input: 'src/assets', output: 'assets', followSymlinks: true },
    ];
  });
  fs.mkdirSync('dirToSymlink/subdir1', { recursive: true });
  fs.mkdirSync('dirToSymlink/subdir2/subsubdir1', { recursive: true });
  fs.writeFileSync('dirToSymlink/a.txt', '');
  fs.writeFileSync('dirToSymlink/subdir1/b.txt', '');
  fs.writeFileSync('dirToSymlink/subdir2/c.txt', '');
  fs.writeFileSync('dirToSymlink/subdir2/subsubdir1/d.txt', '');
  fs.symlinkSync(process.cwd() + '/dirToSymlink', 'src/assets/symlinkDir');

  await ng('build', '--configuration=development');

  await expectFileToExist('dist/test-project/assets/symlinkDir/a.txt');
  await expectFileToExist('dist/test-project/assets/symlinkDir/subdir1/b.txt');
  await expectFileToExist('dist/test-project/assets/symlinkDir/subdir2/c.txt');
  await expectFileToExist('dist/test-project/assets/symlinkDir/subdir2/subsubdir1/d.txt');
}
