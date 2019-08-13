import * as fs from 'fs';
import { prerelease } from 'semver';
import { packages } from '../../../../lib/packages';
import { getGlobalVariable } from './env';
import { prependToFile, readFile, replaceInFile, writeFile } from './fs';
import { gitCommit } from './git';
import { execAndWaitForOutputToMatch, git, ng, npm, silentNpm } from './process';

const tsConfigPath = 'tsconfig.json';


export function updateJsonFile(filePath: string, fn: (json: any) => any | void) {
  return readFile(filePath)
    .then(tsConfigJson => {
      const tsConfig = JSON.parse(tsConfigJson);
      const result = fn(tsConfig) || tsConfig;

      return writeFile(filePath, JSON.stringify(result, null, 2));
    });
}


export function updateTsConfig(fn: (json: any) => any | void) {
  return updateJsonFile(tsConfigPath, fn);
}


export function ngServe(...args: string[]) {
  return execAndWaitForOutputToMatch('ng',
    ['serve', ...args],
    /: Compiled successfully./);
}


export async function createProject(name: string, ...args: string[]) {
  const extraArgs = [];

  process.chdir(getGlobalVariable('tmp-root'));
  await ng('new', name, '--skip-install', ...extraArgs, ...args);
  process.chdir(name);

  await prepareProjectForE2e(name);
}

export async function prepareProjectForE2e(name) {
  const argv: string[] = getGlobalVariable('argv');

  await git(
    'config',
    'user.email',
    'angular-core+e2e@google.com',
  );
  await git(
    'config',
    'user.name',
    'Angular CLI E2e',
  );
  await git(
    'config',
    'commit.gpgSign',
    'false',
  );

  await useCIChrome(
    'e2e',
  );
  await useCIChrome(
    '',
  );

  // legacy projects
  await useCIChrome(
    'src',
  );

  if (argv['ng-snapshots'] || argv['ng-tag']) {
    await useSha();
  }

  await writeFile('.npmrc', 'registry=http://localhost:4873');

  console.log(
    `Project ${name} created... Installing npm.`,
  );
  await silentNpm(
    'install',
  );
  await useCIDefaults(
    name,
  );
  // Force sourcemaps to be from the root of the filesystem.
  await updateJsonFile(
    'tsconfig.json',
    json => {
      json[
        'compilerOptions'
      ][
        'sourceRoot'
      ] =
        '/';
    },
  );
  await gitCommit(
    'prepare-project-for-e2e',
  );
}

export function useBuiltPackages() {
  return Promise.resolve()
    .then(() => updateJsonFile('package.json', json => {
      if (!json['dependencies']) {
        json['dependencies'] = {};
      }
      if (!json['devDependencies']) {
        json['devDependencies'] = {};
      }

      for (const packageName of Object.keys(packages)) {
        if (json['dependencies'].hasOwnProperty(packageName)
        ) {
          json['dependencies'][packageName] = packages[packageName].tar;
        } else if (json['devDependencies'].hasOwnProperty(packageName)) {
          json['devDependencies'][packageName] = packages[packageName].tar;
        }
      }
    }));
}

export function useSha() {
  const argv = getGlobalVariable('argv');
  if (argv['ng-snapshots'] || argv['ng-tag']) {
    // We need more than the sha here, version is also needed. Examples of latest tags:
    // 7.0.0-beta.4+dd2a650
    // 6.1.6+4a8d56a
    const label = argv['ng-tag'] ? argv['ng-tag'] : '';
    const ngSnapshotVersions = require('../ng-snapshot/package.json');
    return updateJsonFile('package.json', json => {
      // Install over the project with snapshot builds.
      function replaceDependencies(key: string) {
        const missingSnapshots = [];
        Object.keys(json[key] || {})
          .filter(name => name.match(/^@angular\//))
          .forEach(name => {
            const pkgName = name.split(/\//)[1];
            if (pkgName == 'cli') {
              return;
            }
            if (label) {
              json[key][`@angular/${pkgName}`]
                = `github:angular/${pkgName}-builds${label}`;
            } else {
              const replacement = ngSnapshotVersions.dependencies[`@angular/${pkgName}`];
              if (!replacement) {
                missingSnapshots.push(`missing @angular/${pkgName}`);
              }
              json[key][`@angular/${pkgName}`] = replacement;
            }
          });
        if (missingSnapshots.length > 0) {
          throw new Error('e2e test with --ng-snapshots requires all angular packages be ' +
            'listed in tests/legacy-cli/e2e/ng-snapshot/package.json.\nErrors:\n' + missingSnapshots.join('\n  '));
        }
      }
      try {
        replaceDependencies('dependencies');
        replaceDependencies('devDependencies');
      } catch (e) {
        return Promise.reject(e);
      }
    });
  } else {
    return Promise.resolve();
  }
}

export function useNgVersion(version: string) {
  return updateJsonFile('package.json', json => {
    // Install over the project with specific versions.
    Object.keys(json['dependencies'] || {})
      .filter(name => name.match(/^@angular\//))
      .forEach(name => {
        const pkgName = name.split(/\//)[1];
        if (pkgName == 'cli') {
          return;
        }
        json['dependencies'][`@angular/${pkgName}`] = version;
      });

    Object.keys(json['devDependencies'] || {})
      .filter(name => name.match(/^@angular\//))
      .forEach(name => {
        const pkgName = name.split(/\//)[1];
        if (pkgName == 'cli') {
          return;
        }
        json['devDependencies'][`@angular/${pkgName}`] = version;
      });
    // Set the correct peer dependencies for @angular/core and @angular/compiler-cli.
    // This list should be kept up to date with each major release.
    if (version.startsWith('^5')) {
      json['devDependencies']['typescript'] = '>=2.4.2 <2.5';
      json['dependencies']['rxjs'] = '^5.5.0';
      json['dependencies']['zone.js'] = '~0.8.4';
    } else if (version.startsWith('^6')) {
      json['devDependencies']['typescript'] = '>=2.7.2 <2.8';
      json['dependencies']['rxjs'] = '^6.0.0';
      json['dependencies']['zone.js'] = '~0.8.26';
    } else if (version.startsWith('^7')) {
      json['devDependencies']['typescript'] = '>=3.1.1 <3.2';
      json['dependencies']['rxjs'] = '^6.0.0';
      json['dependencies']['zone.js'] = '~0.8.26';
    }
  });
}

export function useCIDefaults(projectName = 'test-project') {
  return updateJsonFile('angular.json', workspaceJson => {
    // Disable progress reporting on CI to reduce spam.
    const project = workspaceJson.projects[projectName];
    const appTargets = project.targets || project.architect;
    appTargets.build.options.progress = false;
    appTargets.test.options.progress = false;
    // Use the CI chrome setup in karma.
    appTargets.test.options.browsers = 'ChromeHeadlessCI';
    // Disable auto-updating webdriver in e2e.
    if (appTargets.e2e) {
      appTargets.e2e.options.webdriverUpdate = false;
    }

    // legacy project structure
    const e2eProject = workspaceJson.projects[projectName + '-e2e'];
    if (e2eProject) {
      const e2eTargets = e2eProject.targets || e2eProject.architect;
      e2eTargets.e2e.options.webdriverUpdate = false;
    }
  })
    .then(() => updateJsonFile('package.json', json => {
      // Use matching versions of Chrome and Webdriver.
      json['scripts']['webdriver-update'] = 'webdriver-manager update' +
        ` --standalone false --gecko false --versions.chrome 2.45`; // Supports Chrome v70-72

    }))
    .then(() => npm('run', 'webdriver-update'));
}

export function useCIChrome(projectDir: string) {
  const dir = projectDir ? projectDir + '/' : '';
  const protractorConf = `${dir}protractor.conf.js`;
  const karmaConf = `${dir}karma.conf.js`;

  return Promise.resolve()
    .then(() => updateJsonFile('package.json', json => {
      // Use matching versions of Chrome and Webdriver.
      json['devDependencies']['puppeteer'] = '1.11.0'; // Chromium 72.0.3618.0 (r609904)
      json['devDependencies']['karma-chrome-launcher'] = '~2.2.0'; // Minimum for ChromeHeadless.
    }))
    // Use Pupeteer in protractor if a config is found on the project.
    .then(() => {
      if (fs.existsSync(protractorConf)) {
        return replaceInFile(protractorConf,
          `'browserName': 'chrome'`,
          `'browserName': 'chrome',
          chromeOptions: {
            args: ['--headless'],
            binary: require('puppeteer').executablePath()
          }
        `);
      }
    })
    // Use Pupeteer in karma if a config is found on the project.
    .then(() => {
      if (fs.existsSync(karmaConf)) {
        return prependToFile(karmaConf,
          `process.env.CHROME_BIN = require('puppeteer').executablePath();`)
          .then(() => replaceInFile(karmaConf,
            `browsers: ['Chrome']`,
            `browsers: ['Chrome'],
          customLaunchers: {
            ChromeHeadlessCI: {
              base: 'ChromeHeadless',
            }
          }
        `));
      }
    });
}

export async function isPrereleaseCli() {
  const angularCliPkgJson = JSON.parse(await readFile('node_modules/@angular/cli/package.json'));
  const pre = prerelease(angularCliPkgJson.version);

  return pre && pre.length > 0;
}
