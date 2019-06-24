import { join } from 'path';
import { getGlobalVariable } from '../utils/env';
import { expectFileToExist } from '../utils/fs';
import { gitClean } from '../utils/git';
import { ng } from '../utils/process';
import { prepareProjectForE2e } from '../utils/project';

export default async function() {
  const argv = getGlobalVariable('argv');

  if (argv.noproject) {
    return;
  }

  if (argv.reuse) {
    process.chdir(argv.reuse);
    await gitClean();
  } else {
    const extraArgs = [];

    if (argv['ivy']) {
      extraArgs.push('--enable-ivy');
    }

    await ng('new', 'test-project', '--skip-install', ...extraArgs);
    await expectFileToExist(join(process.cwd(), 'test-project'));
    process.chdir('./test-project');
  }

  await prepareProjectForE2e('test-project');
  await ng('version');
}
