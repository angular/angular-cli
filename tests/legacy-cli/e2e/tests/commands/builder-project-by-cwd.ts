import { join } from 'path';
import { expectFileToExist } from '../../utils/fs';
import { ng } from '../../utils/process';

export default async function () {
  await ng('generate', 'app', 'second-app', '--skip-install');
  await ng('generate', 'app', 'third-app', '--skip-install');
  const startCwd = process.cwd();

  try {
    // When no project is provided it should favor the project that is located in the current working directory.
    process.chdir(join(startCwd, 'projects/second-app'));
    await ng('build', '--configuration=development');

    process.chdir(startCwd);
    await expectFileToExist('dist/second-app');
  } finally {
    // restore path
    process.chdir(startCwd);
  }
}
