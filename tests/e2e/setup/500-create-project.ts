import {join} from 'path';
import {git, ng, silentNpm} from '../utils/process';
import {isMobileTest, isUniversalTest} from '../utils/utils';
import {expectFileToExist} from '../utils/fs';
import {updateTsConfig, updateJsonFile} from '../utils/project';
import {gitClean, gitCommit} from '../utils/git';


export default function(argv: any) {
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
      .then(() => ng('new', 'test-project', '--skip-npm', isMobileTest() ? '--mobile' : undefined,
        isUniversalTest() ? '--universal' : undefined))
      .then(() => expectFileToExist(join(process.cwd(), 'test-project')))
      .then(() => process.chdir('./test-project'));
  }

  return Promise.resolve()
    .then(() => createProject)
    .then(() => updateJsonFile('package.json', json => {
      const dist = join(__dirname, '../../../dist/');
      json['devDependencies']['angular-cli'] = join(dist, 'angular-cli');
      json['devDependencies']['@angular-cli/ast-tools'] = join(dist, 'ast-tools');
      json['devDependencies']['@angular-cli/base-href-webpack'] = join(dist, 'base-href-webpack');
      json['devDependencies']['@ngtools/webpack'] = join(dist, 'webpack');
    }))
    .then(() => {
      if (argv.nightly) {
        return updateJsonFile('package.json', json => {
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
          angularPackages.forEach(pkgName => {
            json['dependencies'][`@angular/${pkgName}`] = `github:angular/${pkgName}-builds`;
          });
        });
      }
    })
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
