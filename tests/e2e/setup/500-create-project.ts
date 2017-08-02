import {join} from 'path';
import {git, ng, silentNpm} from '../utils/process';
import {expectFileToExist, replaceInFile} from '../utils/fs';
import {
  updateTsConfig,
  updateJsonFile,
  useNg2,
  useSha,
  useCIChrome,
  useCIDefaults
  useBuiltPackages,
} from '../utils/project';
import {gitClean, gitCommit} from '../utils/git';
import {getGlobalVariable} from '../utils/env';


let packages = require('../../../lib/packages').packages;


export default function() {
  const argv = getGlobalVariable('argv');
  let createProject = null;

  // This is a dangerous flag, but is useful for testing packages only.
  if (argv.noproject) {
    return Promise.resolve();
  } else if (argv.reuse) {
    // If we're set to reuse an existing project, just chdir to it and clean it.
    createProject = Promise.resolve()
      .then(() => process.chdir(argv.reuse))
      .then(() => gitClean());
  } else {
    // Otherwise create a project from scratch.
    createProject = Promise.resolve()
      .then(() => ng('new', 'test-project', '--skip-install'))
      .then(() => expectFileToExist(join(process.cwd(), 'test-project')))
      .then(() => process.chdir('./test-project'));
  }

  return Promise.resolve()
    .then(() => createProject)
    .then(() => useBuiltPackages())
    .then(() => useCIChrome())
    .then(() => useCIDefaults())
    .then(() => argv['ng2'] ? useNg2() : Promise.resolve())
    .then(() => argv.nightly || argv['ng-sha'] ? useSha() : Promise.resolve())
    // npm link on Circle CI is very noisy.
    .then(() => silentNpm('install'))
    // Force sourcemaps to be from the root of the filesystem.
    .then(() => updateTsConfig(json => {
      json['compilerOptions']['sourceRoot'] = '/';
    }))
    .then(() => git('config', 'user.email', 'angular-core+e2e@google.com'))
    .then(() => git('config', 'user.name', 'Angular CLI E2e'))
    .then(() => git('config', 'commit.gpgSign', 'false'))
    .then(() => gitCommit('tsconfig-e2e-update'));
}
