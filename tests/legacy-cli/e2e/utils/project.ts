import * as fs from 'fs';
import * as path from 'path';
import { prerelease, SemVer } from 'semver';
import yargsParser from 'yargs-parser';
import { getGlobalVariable } from './env';
import { readFile, replaceInFile, writeFile } from './fs';
import { gitCommit } from './git';
import { findFreePort } from './network';
import { installWorkspacePackages, PkgInfo } from './packages';
import { execAndWaitForOutputToMatch, git, ng } from './process';

export function updateJsonFile(filePath: string, fn: (json: any) => any | void) {
  return readFile(filePath).then((tsConfigJson) => {
    // Remove single and multiline comments
    const tsConfig = JSON.parse(tsConfigJson.replace(/\/\*\s(.|\n|\r)*\s\*\/|\/\/.*/g, ''));
    const result = fn(tsConfig) || tsConfig;

    return writeFile(filePath, JSON.stringify(result, null, 2));
  });
}

export function updateTsConfig(fn: (json: any) => any | void) {
  return updateJsonFile('tsconfig.json', fn);
}

export async function ngServe(...args: string[]) {
  const port = await findFreePort();

  const esbuild = getGlobalVariable('argv')['esbuild'];
  const validBundleRegEx = esbuild ? /Complete\./ : /Compiled successfully\./;

  await execAndWaitForOutputToMatch(
    'ng',
    ['serve', '--port', String(port), ...args],
    validBundleRegEx,
  );

  return port;
}
export async function prepareProjectForE2e(name: string) {
  const argv: yargsParser.Arguments = getGlobalVariable('argv');

  await git('config', 'user.email', 'angular-core+e2e@google.com');
  await git('config', 'user.name', 'Angular CLI E2E');
  await git('config', 'commit.gpgSign', 'false');
  await git('config', 'core.longpaths', 'true');

  if (argv['ng-snapshots'] || argv['ng-tag']) {
    await useSha();
  }

  console.log(`Project ${name} created... Installing packages.`);
  await installWorkspacePackages();
  await ng('generate', 'e2e', '--related-app-name', name);

  await useCIChrome(name, 'e2e');
  await useCIChrome(name, '');
  await useCIDefaults(name);

  // Force sourcemaps to be from the root of the filesystem.
  await updateJsonFile('tsconfig.json', (json) => {
    json['compilerOptions']['sourceRoot'] = '/';
  });
  await gitCommit('prepare-project-for-e2e');
}

export function useBuiltPackagesVersions(): Promise<void> {
  const packages: { [name: string]: PkgInfo } = getGlobalVariable('package-tars');

  return updateJsonFile('package.json', (json) => {
    json['dependencies'] ??= {};
    json['devDependencies'] ??= {};

    for (const packageName of Object.keys(packages)) {
      if (packageName in json['dependencies']) {
        json['dependencies'][packageName] = packages[packageName].version;
      } else if (packageName in json['devDependencies']) {
        json['devDependencies'][packageName] = packages[packageName].version;
      }
    }
  });
}

export function useSha() {
  const argv = getGlobalVariable('argv');
  if (argv['ng-snapshots'] || argv['ng-tag']) {
    // We need more than the sha here, version is also needed. Examples of latest tags:
    // 7.0.0-beta.4+dd2a650
    // 6.1.6+4a8d56a
    const label = argv['ng-tag'] ? argv['ng-tag'] : '';
    const ngSnapshotVersions = require('../ng-snapshot/package.json');
    return updateJsonFile('package.json', (json) => {
      // Install over the project with snapshot builds.
      function replaceDependencies(key: string) {
        const missingSnapshots: string[] = [];
        Object.keys(json[key] || {})
          .filter((name) => name.match(/^@angular\//))
          .forEach((name) => {
            const pkgName = name.split(/\//)[1];
            if (pkgName == 'cli') {
              return;
            }
            if (label) {
              json[key][`@angular/${pkgName}`] = `github:angular/${pkgName}-builds${label}`;
            } else {
              const replacement = ngSnapshotVersions.dependencies[`@angular/${pkgName}`];
              if (!replacement) {
                missingSnapshots.push(`missing @angular/${pkgName}`);
              }
              json[key][`@angular/${pkgName}`] = replacement;
            }
          });
        if (missingSnapshots.length > 0) {
          throw new Error(
            'e2e test with --ng-snapshots requires all angular packages be ' +
              'listed in tests/legacy-cli/e2e/ng-snapshot/package.json.\nErrors:\n' +
              missingSnapshots.join('\n  '),
          );
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

export function useCIDefaults(projectName = 'test-project'): Promise<void> {
  return updateJsonFile('angular.json', (workspaceJson) => {
    // Disable progress reporting on CI to reduce spam.
    const project = workspaceJson.projects[projectName];
    const appTargets = project.targets || project.architect;
    appTargets.build.options.progress = false;
    appTargets.test.options.progress = false;
    if (appTargets.e2e) {
      // Disable auto-updating webdriver in e2e.
      appTargets.e2e.options.webdriverUpdate = false;
      // Use a random port in e2e.
      appTargets.e2e.options.port = 0;
    }

    if (appTargets.serve) {
      // Use a random port in serve.
      appTargets.serve.options ??= {};
      appTargets.serve.options.port = 0;
    }
  });
}

export async function useCIChrome(projectName: string, projectDir = ''): Promise<void> {
  const protractorConf = path.join(projectDir, 'protractor.conf.js');
  if (fs.existsSync(protractorConf)) {
    // Ensure the headless sandboxed chrome is configured in the protractor config
    await replaceInFile(
      protractorConf,
      `browserName: 'chrome'`,
      `browserName: 'chrome',
      chromeOptions: {
        args: ['--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
        binary: String.raw\`${process.env.CHROME_BIN}\`,
      }`,
    );
    await replaceInFile(
      protractorConf,
      'directConnect: true,',
      `directConnect: true, chromeDriver: String.raw\`${process.env.CHROMEDRIVER_BIN}\`,`,
    );
  }

  const karmaConf = path.join(projectDir, 'karma.conf.js');
  if (fs.existsSync(karmaConf)) {
    // Ensure the headless sandboxed chrome is configured in the karma config
    await replaceInFile(
      karmaConf,
      `browsers: ['Chrome'],`,
      `browsers: ['ChromeHeadlessNoSandbox'],
      customLaunchers: {
        ChromeHeadlessNoSandbox: {
          base: 'ChromeHeadless',
          flags: ['--no-sandbox', '--headless', '--disable-gpu', '--disable-dev-shm-usage'],
        },
      },`,
    );
  }

  // Update to use the headless sandboxed chrome
  return updateJsonFile('angular.json', (workspaceJson) => {
    const project = workspaceJson.projects[projectName];
    const appTargets = project.targets || project.architect;
    appTargets.test.options.browsers = 'ChromeHeadlessNoSandbox';
  });
}

export function getNgCLIVersion(): SemVer {
  const packages: { [name: string]: PkgInfo } = getGlobalVariable('package-tars');

  return new SemVer(packages['@angular/cli'].version);
}

export function isPrereleaseCli(): boolean {
  return (prerelease(getNgCLIVersion())?.length ?? 0) > 0;
}
