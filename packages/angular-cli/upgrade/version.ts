import {CliConfig} from '../models/config';
import {readFileSync, existsSync} from 'fs';
import {stripIndents} from 'common-tags';
import {bold, red, yellow} from 'chalk';
import * as path from 'path';
const resolve = require('resolve');


function _findUp(name: string, from: string) {
  let currentDir = from;
  while (currentDir && currentDir !== path.parse(currentDir).root) {
    const p = path.join(currentDir, name);
    if (existsSync(p)) {
      return p;
    }

    currentDir = path.dirname(currentDir);
  }

  return null;
}


function _hasOldCliBuildFile() {
  return existsSync(_findUp('angular-cli-build.js', process.cwd()))
      || existsSync(_findUp('angular-cli-build.ts', process.cwd()))
      || existsSync(_findUp('ember-cli-build.js', process.cwd()))
      || existsSync(_findUp('angular-cli-build.js', __dirname))
      || existsSync(_findUp('angular-cli-build.ts', __dirname))
      || existsSync(_findUp('ember-cli-build.js', __dirname));
}


export class Version {
  constructor(private _version: string) {}

  private _parse() {
    return this.isKnown()
      ? this._version.match(/^(\d+)\.(\d+)(?:\.(\d+))?(?:-(alpha|beta|rc)\.(.*))?$/).slice(1)
      : [];
  }

  isAlpha() { return this.qualifier == 'alpha'; }
  isBeta() { return this.qualifier == 'beta'; }
  isReleaseCandidate() { return this.qualifier == 'rc'; }
  isKnown() { return this._version !== null; }

  get major() { return this._parse()[0] || 0; }
  get minor() { return this._parse()[1] || 0; }
  get patch() { return this._parse()[2] || 0; }
  get qualifier() { return this._parse()[3] || ''; }
  get extra() { return this._parse()[4] || ''; }

  toString() { return this._version; }

  static fromProject(): Version {
    let packageJson: any = null;

    try {
      const angularCliPath = resolve.sync('angular-cli', {
        basedir: process.cwd(),
        packageFilter: (pkg: any, pkgFile: string) => {
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
      return new Version(json.project && json.project.version);
    } catch (e) {
      return new Version(null);
    }
  }

  static assertPostWebpackVersion() {
    if (this.isPreWebpack()) {
      console.error(bold(red('\n' + stripIndents`
        It seems like you're using a project generated using an old version of the Angular CLI.
        The latest CLI now uses webpack and includes a lot of improvements, include a simpler
        workflow, a faster build and smaller bundles.
        
        To get more info, including a step-by-step guide to upgrade the CLI, follow this link:
        https://github.com/angular/angular-cli/wiki/Upgrading-from-Beta.10-to-Beta.12
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
