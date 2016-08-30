import {join} from 'path';
import {git, ng, npm} from '../utils/process';
import {isMobileTest} from '../utils/utils';
import {expectFileToExist} from '../utils/fs';
import {updateTsConfig} from '../utils/project';
import {gitClean, gitCommit} from '../utils/git';


export default function(argv: any) {
  let createProject = null;

  // If we're set to reuse an existing project, just chdir to it and clean it.
  if (argv.reuse) {
    createProject = Promise.resolve()
      .then(() => process.chdir(argv.reuse))
      .then(() => gitClean());
  } else {
    // Otherwise create a project from scratch.
    createProject = Promise.resolve()
      .then(() => ng('new', 'test-project', '--link-cli', isMobileTest() ? '--mobile' : undefined))
      .then(() => expectFileToExist(join(process.cwd(), 'test-project')))
      .then(() => process.chdir('./test-project'));
  }

  if (argv.nightly) {
    // Install over the project with nightly builds.
    const angularPackages = [
      'core',
      'common',
      'compiler',
      'forms',
      'http',
      'router',
      'platform-browser',
      'platform-browser-dynamic'
    ];
    createProject = createProject
      .then(() => npm('install', ...angularPackages.map(name => `angular/${name}-builds`)));
  }

  return Promise.resolve()
    .then(() => createProject)
    // Force sourcemaps to be from the root of the filesystem.
    .then(() => updateTsConfig(json => {
      json['compilerOptions']['sourceRoot'] = '/';
    }))
    .then(() => git('config', 'user.email', 'angular-core+e2e@google.com'))
    .then(() => git('config', 'user.name', 'Angular CLI E2e'))
    .then(() => gitCommit('tsconfig-e2e-update'));
}
