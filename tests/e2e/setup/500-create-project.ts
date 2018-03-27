import {join} from 'path';
import {git, ng, npm, silentNpm} from '../utils/process';
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
    // Force rxjs 5.5.8, so that devkit packages use it.
    .then(() => updateJsonFile('package.json', json => {
      json.dependencies['rxjs'] = '5.5.8';
    }))
    .then(() => silentNpm('install'))
    // Then force rxjs 5.6.0-forward-compat.2, which can't be used by devkit packages.
    .then(() => npm('install', 'rxjs@5.6.0-forward-compat.2', '--save-exact'))
    // Verify we have multiple rxjs, and the versions we expect.
    // For some reason `npm list` doesn't show the right version. That's just peachy.
    // .then(() => npm('list', 'rxjs'))
    .then(() => updateJsonFile('node_modules/rxjs/package.json', json => {
      console.log('top level rxjs version', json.version)
    }))
    .then(() => updateJsonFile('node_modules/@angular-devkit/core/node_modules/rxjs/package.json', json => {
      console.log('devkit/core rxjs version', json.version)
    }))
    .then(() => updateJsonFile('node_modules/@angular-devkit/architect/node_modules/rxjs/package.json', json => {
      console.log('devkit/architect rxjs version', json.version)
    }))
    .then(() => updateJsonFile('node_modules/@angular-devkit/schematics/node_modules/rxjs/package.json', json => {
      console.log('devkit/schematics rxjs version', json.version)
    }))
    .then(() => updateJsonFile('node_modules/@angular-devkit/build-webpack/node_modules/rxjs/package.json', json => {
      console.log('devkit/build-webpack rxjs version', json.version)
    }))
    .then(() => updateJsonFile('node_modules/@schematics/angular/node_modules/rxjs/package.json', json => {
      console.log('schematics/angular rxjs version', json.version)
    }))
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
