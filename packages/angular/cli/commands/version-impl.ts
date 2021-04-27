/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as path from 'path';
import { Command } from '../models/command';
import { colors } from '../utilities/color';
import { JSONFile } from '../utilities/json-file';
import { Schema as VersionCommandSchema } from './version';

interface PartialPackageInfo {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export class VersionCommand extends Command<VersionCommandSchema> {
  public static aliases = ['v'];

  async run() {
    const cliPackage: PartialPackageInfo = require('../package.json');
    let workspacePackage: PartialPackageInfo | undefined;
    try {
      workspacePackage = require(path.resolve(this.context.root, 'package.json'));
    } catch {}

    const patterns = [
      /^@angular\/.*/,
      /^@angular-devkit\/.*/,
      /^@bazel\/.*/,
      /^@ngtools\/.*/,
      /^@nguniversal\/.*/,
      /^@schematics\/.*/,
      /^rxjs$/,
      /^typescript$/,
      /^ng-packagr$/,
      /^webpack$/,
    ];

    const packageNames = [
      ...Object.keys(cliPackage.dependencies || {}),
      ...Object.keys(cliPackage.devDependencies || {}),
      ...Object.keys(workspacePackage?.dependencies || {}),
      ...Object.keys(workspacePackage?.devDependencies || {}),
    ];

    const versions = packageNames
      .filter(x => patterns.some(p => p.test(x)))
      .reduce(
        (acc, name) => {
          if (name in acc) {
            return acc;
          }

          acc[name] = this.getVersion(name);

          return acc;
        },
        {} as { [module: string]: string },
      );

    const ngCliVersion = cliPackage.version;
    let angularCoreVersion = '';
    const angularSameAsCore: string[] = [];

    if (workspacePackage) {
      // Filter all angular versions that are the same as core.
      angularCoreVersion = versions['@angular/core'];
      if (angularCoreVersion) {
        for (const angularPackage of Object.keys(versions)) {
          if (
            versions[angularPackage] == angularCoreVersion &&
            angularPackage.startsWith('@angular/')
          ) {
            angularSameAsCore.push(angularPackage.replace(/^@angular\//, ''));
            delete versions[angularPackage];
          }
        }

        // Make sure we list them in alphabetical order.
        angularSameAsCore.sort();
      }
    }

    const namePad = ' '.repeat(
      Object.keys(versions).sort((a, b) => b.length - a.length)[0].length + 3,
    );
    const asciiArt = `
     _                      _                 ____ _     ___
    / \\   _ __   __ _ _   _| | __ _ _ __     / ___| |   |_ _|
   / △ \\ | '_ \\ / _\` | | | | |/ _\` | '__|   | |   | |    | |
  / ___ \\| | | | (_| | |_| | | (_| | |      | |___| |___ | |
 /_/   \\_\\_| |_|\\__, |\\__,_|_|\\__,_|_|       \\____|_____|___|
                |___/
    `
      .split('\n')
      .map(x => colors.red(x))
      .join('\n');

    this.logger.info(asciiArt);
    this.logger.info(
      `
      Angular CLI: ${ngCliVersion}
      Node: ${process.versions.node}
      OS: ${process.platform} ${process.arch}

      Angular: ${angularCoreVersion}
      ... ${angularSameAsCore
        .reduce<string[]>((acc, name) => {
          // Perform a simple word wrap around 60.
          if (acc.length == 0) {
            return [name];
          }
          const line = acc[acc.length - 1] + ', ' + name;
          if (line.length > 60) {
            acc.push(name);
          } else {
            acc[acc.length - 1] = line;
          }

          return acc;
        }, [])
        .join('\n... ')}
      Ivy Workspace: ${workspacePackage ? this.getIvyWorkspace() : ''}

      Package${namePad.slice(7)}Version
      -------${namePad.replace(/ /g, '-')}------------------
      ${Object.keys(versions)
        .map(module => `${module}${namePad.slice(module.length)}${versions[module]}`)
        .sort()
        .join('\n')}
    `.replace(/^ {6}/gm, ''),
    );
  }

  private getVersion(moduleName: string): string {
    let packagePath;
    let cliOnly = false;

    // Try to find the package in the workspace
    try {
      packagePath = require.resolve(`${moduleName}/package.json`, { paths: [ this.context.root ]});
    } catch {}

    // If not found, try to find within the CLI
    if (!packagePath) {
      try {
        packagePath = require.resolve(`${moduleName}/package.json`);
        cliOnly = true;
      } catch {}
    }

    let version: string | undefined;

    // If found, attempt to get the version
    if (packagePath) {
      try {
        version = require(packagePath).version + (cliOnly ? ' (cli-only)' : '');
      } catch {}
    }

    return version || '<error>';
  }

  private getIvyWorkspace(): string {
    try {
      const json = new JSONFile(path.resolve(this.context.root, 'tsconfig.json'));

      return json.get(['angularCompilerOptions', 'enableIvy']) === false
        ? 'No'
        : 'Yes';
    } catch {
      return '<error>';
    }
  }
}
