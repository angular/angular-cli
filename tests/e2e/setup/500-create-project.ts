import {join} from 'path';
import {git, ng, silentNpm} from '../utils/process';
import {expectFileToExist, replaceInFile} from '../utils/fs';
import {updateTsConfig, updateJsonFile, useNg2} from '../utils/project';
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
    .then(() => updateJsonFile('package.json', json => {
      Object.keys(packages).forEach(pkgName => {
        json['dependencies'][pkgName] = packages[pkgName].tar;
      });
    }))
    // There's a race condition happening in Chrome. Enabling logging in chrome used by
    // protractor actually fixes it. Logging is piped to a file so it doesn't affect our setup.
    // --no-sandbox is needed for Circle CI.
    .then(() => replaceInFile('protractor.conf.js', `'browserName': 'chrome'`,
      `'browserName': 'chrome',
        chromeOptions: {
          args: [
            "--enable-logging",
            "--no-sandbox",
          ]
        }
      `))
    .then(() => replaceInFile('karma.conf.js', `browsers: ['Chrome'],`,
      `browsers: ['ChromeNoSandbox'],
      customLaunchers: {
        ChromeNoSandbox: {
          base: 'Chrome',
          flags: ['--no-sandbox']
        }
      },
      `))
    .then(() => argv['ng2'] ? useNg2() : Promise.resolve())
    .then(() => {
      if (argv['nightly'] || argv['ng-sha']) {
        const label = argv['ng-sha'] ? `#2.0.0-${argv['ng-sha']}` : '';
        return updateJsonFile('package.json', json => {
          // Install over the project with nightly builds.
          Object.keys(json['dependencies'] || {})
            .filter(name => name.match(/^@angular\//))
            .forEach(name => {
              const pkgName = name.split(/\//)[1];
              if (pkgName == 'cli') {
                return;
              }
              json['dependencies'][`@angular/${pkgName}`]
                = `github:angular/${pkgName}-builds${label}`;
            });

          Object.keys(json['devDependencies'] || {})
            .filter(name => name.match(/^@angular\//))
            .forEach(name => {
              const pkgName = name.split(/\//)[1];
              if (pkgName == 'cli') {
                return;
              }
              json['devDependencies'][`@angular/${pkgName}`]
                = `github:angular/${pkgName}-builds${label}`;
            });
        });
      }
    })
    .then(() => updateJsonFile('.angular-cli.json', configJson => {
      // Auto-add some flags to ng commands that build or test the app.
      // --no-progress disables progress logging, which in CI logs thousands of lines.
      // --no-sourcemaps disables sourcemaps, making builds faster.
      // We add these flags before other args so that they can be overriden.
      // e.g. `--no-sourcemaps --sourcemaps` will still generate sourcemaps.
      const defaults = configJson.defaults;
      defaults.build = {
        sourcemaps: false,
        progress: false
      };
    }))
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
