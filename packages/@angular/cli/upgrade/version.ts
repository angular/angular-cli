import {SemVer, satisfies} from 'semver';
import chalk from 'chalk';
import {stripIndents, stripIndent} from 'common-tags';
import {readFileSync, existsSync} from 'fs';
import * as path from 'path';

import {CliConfig} from '../models/config';
import {findUp} from '../utilities/find-up';
import {requireProjectModule} from '../utilities/require-project-module';

const resolve = require('resolve');


const { bold, red, yellow } = chalk;

function _hasOldCliBuildFile() {
  return existsSync(findUp('angular-cli-build.js', process.cwd()))
      || existsSync(findUp('angular-cli-build.ts', process.cwd()))
      || existsSync(findUp('ember-cli-build.js', process.cwd()))
      || existsSync(findUp('angular-cli-build.js', __dirname))
      || existsSync(findUp('angular-cli-build.ts', __dirname))
      || existsSync(findUp('ember-cli-build.js', __dirname));
}


export class Version {
  private _semver: SemVer = null;
  constructor(private _version: string = null) {
    this._semver = _version && new SemVer(_version);
  }

  isAlpha() { return this.qualifier == 'alpha'; }
  isBeta() { return this.qualifier == 'beta'; }
  isReleaseCandidate() { return this.qualifier == 'rc'; }
  isKnown() { return this._version !== null; }

  isLocal() { return this.isKnown() && path.isAbsolute(this._version); }
  isGreaterThanOrEqualTo(other: SemVer) {
    return this._semver.compare(other) >= 0;
  }

  get major() { return this._semver ? this._semver.major : 0; }
  get minor() { return this._semver ? this._semver.minor : 0; }
  get patch() { return this._semver ? this._semver.patch : 0; }
  get qualifier() { return this._semver ? this._semver.prerelease[0] : ''; }
  get extra() { return this._semver ? this._semver.prerelease[1] : ''; }

  toString() { return this._version; }

  static fromProject(): Version {
    let packageJson: any = null;

    try {
      const angularCliPath = resolve.sync('@angular/cli', {
        basedir: process.cwd(),
        packageFilter: (pkg: any, _pkgFile: string) => {
          packageJson = pkg;
        }
      });
      if (angularCliPath && packageJson) {
        try {
          return new Version(packageJson.version);
        } catch (e) {
          return new Version(null);
        }
      }
    } catch (e) {
      // Fallback to reading config.
    }


    const configPath = CliConfig.configFilePath();

    if (configPath === null) {
      return new Version(null);
    }

    const configJson = readFileSync(configPath, 'utf8');

    try {
      const json = JSON.parse(configJson);
      return new Version(json.project);
    } catch (e) {
      return new Version(null);
    }
  }

  static assertAngularVersionIs2_3_1OrHigher(projectRoot: string) {
    let pkgJson;
    try {
      pkgJson = requireProjectModule(projectRoot, '@angular/core/package.json');
    } catch (_) {
      console.error(bold(red(stripIndents`
        You seem to not be depending on "@angular/core". This is an error.
      `)));
      process.exit(2);
    }

    // Just check @angular/core.
    if (pkgJson && pkgJson['version']) {
      const v = new Version(pkgJson['version']);
      if (v.isLocal()) {
        console.warn(yellow('Using a local version of angular. Proceeding with care...'));
      } else {
        // Check if major is not 0, so that we stay compatible with local compiled versions
        // of angular.
        if (!v.isGreaterThanOrEqualTo(new SemVer('2.3.1')) && v.major != 0) {
          console.error(bold(red(stripIndents`
            This version of CLI is only compatible with angular version 2.3.1 or better. Please
            upgrade your angular version, e.g. by running:

            npm install @angular/core@latest
          ` + '\n')));
          process.exit(3);
        }
      }
    } else {
      console.error(bold(red(stripIndents`
        You seem to not be depending on "@angular/core". This is an error.
      `)));
      process.exit(2);
    }
  }

  static assertPostWebpackVersion() {
    if (this.isPreWebpack()) {
      console.error(bold(red('\n' + stripIndents`
        It seems like you're using a project generated using an old version of the Angular CLI.
        The latest CLI now uses webpack and has a lot of improvements including a simpler
        workflow, a faster build, and smaller bundles.

        To get more info, including a step-by-step guide to upgrade the CLI, follow this link:
        https://github.com/angular/angular-cli/wiki/Upgrading-from-Beta.10-to-Beta.14
      ` + '\n')));
      process.exit(1);
    } else {
      // Verify that there's no build file.
      if (_hasOldCliBuildFile()) {
        console.error(bold(yellow('\n' + stripIndents`
          It seems like you're using the newest version of the Angular CLI that uses webpack.
          This version does not require an angular-cli-build file, but your project has one.
          It will be ignored.
        ` + '\n')));
      }
    }
  }

  static assertTypescriptVersion(projectRoot: string) {
    const config = CliConfig.fromProject() || CliConfig.fromGlobal();
    if (!config.get('warnings.typescriptMismatch')) {
      return;
    }
    let compilerVersion: string, tsVersion: string;
    try {
      compilerVersion = requireProjectModule(projectRoot, '@angular/compiler-cli').VERSION.full;
      tsVersion = requireProjectModule(projectRoot, 'typescript').version;
    } catch (_) {
      console.error(bold(red(stripIndents`
        Versions of @angular/compiler-cli and typescript could not be determined.
        The most common reason for this is a broken npm install.

        Please make sure your package.json contains both @angular/compiler-cli and typescript in
        devDependencies, then delete node_modules and package-lock.json (if you have one) and
        run npm install again.
      `)));
      process.exit(2);
    }

    const versionCombos = [
      { compiler: '>=2.3.1 <3.0.0', typescript: '>=2.0.2 <2.3.0' },
      { compiler: '>=4.0.0 <5.0.0', typescript: '>=2.1.0 <2.4.0' },
      { compiler: '>=5.0.0 <5.1.0', typescript: '>=2.4.2 <2.5.0' },
      { compiler: '>=5.1.0 <5.2.0', typescript: '>=2.4.2 <2.6.0' },
      { compiler: '>=5.2.0 <6.0.0', typescript: '>=2.4.2 <2.7.0' }
    ];

    const currentCombo = versionCombos.find((combo) => satisfies(compilerVersion, combo.compiler));

    if (currentCombo && !satisfies(tsVersion, currentCombo.typescript)) {
      // First line of warning looks weird being split in two, disable tslint for it.
      console.log((yellow('\n' + stripIndent`
        @angular/compiler-cli@${compilerVersion} requires typescript@'${
          currentCombo.typescript}' but ${tsVersion} was found instead.
        Using this version can result in undefined behaviour and difficult to debug problems.

        Please run the following command to install a compatible version of TypeScript.

            npm install typescript@'${currentCombo.typescript}'

        To disable this warning run "ng set warnings.typescriptMismatch=false".
      ` + '\n')));
    }
  }

  static isPreWebpack(): boolean {
    // CliConfig is a bit stricter with the schema, so we need to be a little looser with it.
    const version = Version.fromProject();

    if (version && version.isKnown()) {
      if (version.major == 0) {
        return true;
      } else if (version.minor != 0) {
        return false;
      } else if (version.isBeta() && !version.toString().match(/webpack/)) {
        const betaVersion = version.extra;

        if (parseInt(betaVersion) < 12) {
          return true;
        }
      }
    } else {
      return _hasOldCliBuildFile();
    }

    return false;
  }
}
