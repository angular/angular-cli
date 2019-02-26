import {join} from 'path';
import {ng} from '../utils/process';
import {expectFileToExist} from '../utils/fs';
import {prepareProjectForE2e} from '../utils/project';
import {gitClean} from '../utils/git';
import {getGlobalVariable} from '../utils/env';


export default async function() {
  const argv = getGlobalVariable('argv');
  const extraArgs = [];

  if (argv['ivy']) {
    extraArgs.push('--enable-ivy');
  }

  if (argv.noproject) {
    return;
  }

  if (argv.reuse) {
    process.chdir(argv.reuse);
    await gitClean();
  } else {
    await ng('new', 'test-project', '--skip-install', ...extraArgs);
    await expectFileToExist(join(process.cwd(), 'test-project'));
    process.chdir('./test-project');
  }

  await prepareProjectForE2e('test-project');
  await ng('version');
}
