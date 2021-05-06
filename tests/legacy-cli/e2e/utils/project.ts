import * as fs from 'fs';
import * as path from 'path';
import { prerelease } from 'semver';
import { packages } from '../../../../lib/packages';
import { getGlobalVariable } from './env';
import { prependToFile, readFile, replaceInFile, writeFile } from './fs';
import { gitCommit } from './git';
import { installWorkspacePackages } from './packages';
import { execAndWaitForOutputToMatch, git, ng } from './process';

export function updateJsonFile(filePath: string, fn: (json: any) => any | void) {
  return readFile(filePath)
    .then(tsConfigJson => {
      // Remove single and multiline comments
      const tsConfig = JSON.parse(tsConfigJson.replace(/\/\*\s(.|\n|\r)*\s\*\/|\/\/.*/g, ''));
      const result = fn(tsConfig) || tsConfig;

      return writeFile(filePath, JSON.stringify(result, null, 2));
    });
}


export function updateTsConfig(fn: (json: any) => any | void) {
  return updateJsonFile('tsconfig.json', fn);
}


export function ngServe(...args: string[]) {
  return execAndWaitForOutputToMatch('ng',
    ['serve', ...args],
    / Compiled successfully./);
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

  await ng('generate', '@schematics/angular:e2e', '--related-app-name', name);

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

  console.log(
    `Project ${name} created... Installing npm.`,
  );
  await installWorkspacePackages();
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
  });
}

export async function useCIChrome(projectDir: string = ''): Promise<void> {
  const protractorConf = path.join(projectDir, 'protractor.conf.js');
  const karmaConf = path.join(projectDir, 'karma.conf.js');

  const chromePath = require('puppeteer').executablePath();
  const protractorPath = require.resolve('protractor');
  const webdriverUpdatePath = require.resolve('webdriver-manager/selenium/update-config.json', {
    paths: [protractorPath],
  });
  const webdriverUpdate = JSON.parse(await readFile(webdriverUpdatePath)) as {
    chrome: { last: string };
  };
  const chromeDriverPath = webdriverUpdate.chrome.last;

  // Use Puppeteer in protractor if a config is found on the project.
  if (fs.existsSync(protractorConf)) {
    await replaceInFile(
      protractorConf,
      `browserName: 'chrome'`,
      `browserName: 'chrome',
      chromeOptions: {
        args: ['--headless'],
        binary: String.raw\`${chromePath}\`,
      }`,
    );
    await replaceInFile(
      protractorConf,
      'directConnect: true,',
      `directConnect: true, chromeDriver: String.raw\`${chromeDriverPath}\`,`,
    );
  }

  // Use Puppeteer in karma if a config is found on the project.
  if (fs.existsSync(karmaConf)) {
    await prependToFile(karmaConf, `process.env.CHROME_BIN = String.raw\`${chromePath}\`;`);
    await replaceInFile(karmaConf, `browsers: ['Chrome']`, `browsers: ['ChromeHeadless']`);
  }
}

export function isPrereleaseCli(): boolean {
  const pre = prerelease(packages['@angular/cli'].version);

  return pre && pre.length > 0;
}
