import {join} from 'path';
import {git, ng, silentNpm} from '../utils/process';
import {expectFileToExist} from '../utils/fs';
import {
  useSha,
  useNgVersion,
  useCIChrome,
  useCIDefaults,
  useBuiltPackages,
  useDevKit,
  updateJsonFile,
} from '../utils/project';
import {gitClean, gitCommit} from '../utils/git';
import {getGlobalVariable} from '../utils/env';


export default async function() {
  const argv = getGlobalVariable('argv');

  if (argv.noproject) {
    return;
  }

  if (argv.reuse) {
    process.chdir(argv.reuse);
    await gitClean();
  } else {
    await ng('new', 'test-project', '--skip-install');
    await expectFileToExist(join(process.cwd(), 'test-project'));
    process.chdir('./test-project');
  }

  return Promise.resolve()
    .then(() => useBuiltPackages())
    .then(() => argv.devkit && useDevKit(argv.devkit))
    .then(() => useCIChrome())
    .then(() => useCIDefaults())
    .then(() => argv['ng-version'] ? useNgVersion(argv['ng-version']) : Promise.resolve())
    .then(() => argv.nightly || argv['ng-sha'] ? useSha() : Promise.resolve())
    // npm link on Circle CI is very noisy.
    .then(() => silentNpm('install'))
    .then(() => ng('version'))
    // Force sourcemaps to be from the root of the filesystem.
    .then(() => updateJsonFile('tsconfig.json', json => {
      json['compilerOptions']['sourceRoot'] = '/';
    }))
    .then(() => git('config', 'user.email', 'angular-core+e2e@google.com'))
    .then(() => git('config', 'user.name', 'Angular CLI E2e'))
    .then(() => git('config', 'commit.gpgSign', 'false'))
    .then(() => gitCommit('tsconfig-e2e-update'));
}
