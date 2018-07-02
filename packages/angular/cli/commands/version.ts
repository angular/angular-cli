/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { terminal } from '@angular-devkit/core';
import * as child_process from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { Command, Option } from '../models/command';
import { findUp } from '../utilities/find-up';


export default class VersionCommand extends Command {
  public readonly name = 'version';
  public readonly description = 'Outputs Angular CLI version.';
  public static aliases = ['v'];
  public readonly arguments: string[] = [];
  public readonly options: Option[] = [];

  public run() {
    let angularCoreVersion = '';
    const angularSameAsCore: string[] = [];
    const pkg = require(path.resolve(__dirname, '..', 'package.json'));
    let projPkg;
    try {
      projPkg = require(path.resolve(this.project.root, 'package.json'));
    } catch (exception) {
      projPkg = undefined;
    }

    const patterns = [
      /^@angular\/.*/,
      /^@angular-devkit\/.*/,
      /^@ngtools\/.*/,
      /^@schematics\/.*/,
      /^rxjs$/,
      /^typescript$/,
      /^ng-packagr$/,
      /^webpack$/,
    ];

    const maybeNodeModules = findUp('node_modules', __dirname);
    const packageRoot = projPkg
      ? path.resolve(this.project.root, 'node_modules')
      : maybeNodeModules;

    const packageNames = [
      ...Object.keys(pkg && pkg['dependencies'] || {}),
      ...Object.keys(pkg && pkg['devDependencies'] || {}),
      ...Object.keys(projPkg && projPkg['dependencies'] || {}),
      ...Object.keys(projPkg && projPkg['devDependencies'] || {}),
      ];

    if (packageRoot != null) {
      // Add all node_modules and node_modules/@*/*
      const nodePackageNames = fs.readdirSync(packageRoot)
        .reduce<string[]>((acc, name) => {
          if (name.startsWith('@')) {
            return acc.concat(
              fs.readdirSync(path.resolve(packageRoot, name))
                .map(subName => name + '/' + subName),
            );
          } else {
            return acc.concat(name);
          }
        }, []);

      packageNames.push(...nodePackageNames);
    }

    const versions = packageNames
      .filter(x => patterns.some(p => p.test(x)))
      .reduce((acc, name) => {
        if (name in acc) {
          return acc;
        }

        acc[name] = this.getVersion(name, packageRoot, maybeNodeModules);

        return acc;
      }, {} as { [module: string]: string });

    let ngCliVersion = pkg.version;
    if (!__dirname.match(/node_modules/)) {
      let gitBranch = '??';
      try {
        const gitRefName = '' + child_process.execSync('git symbolic-ref HEAD', {cwd: __dirname});
        gitBranch = path.basename(gitRefName.replace('\n', ''));
      } catch {
      }

      ngCliVersion = `local (v${pkg.version}, branch: ${gitBranch})`;
    }

    if (projPkg) {
      // Filter all angular versions that are the same as core.
      angularCoreVersion = versions['@angular/core'];
      if (angularCoreVersion) {
        for (const angularPackage of Object.keys(versions)) {
          if (versions[angularPackage] == angularCoreVersion
              && angularPackage.startsWith('@angular/')) {
            angularSameAsCore.push(angularPackage.replace(/^@angular\//, ''));
            delete versions[angularPackage];
          }
        }
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
    `.split('\n').map(x => terminal.red(x)).join('\n');

    this.logger.info(asciiArt);
    this.logger.info(`
      Angular CLI: ${ngCliVersion}
      Node: ${process.versions.node}
      OS: ${process.platform} ${process.arch}
      Angular: ${angularCoreVersion}
      ... ${angularSameAsCore.sort().reduce<string[]>((acc, name) => {
        // Perform a simple word wrap around 60.
        if (acc.length == 0) {
          return [name];
        }
        const line = (acc[acc.length - 1] + ', ' + name);
        if (line.length > 60) {
          acc.push(name);
        } else {
          acc[acc.length - 1] = line;
        }

        return acc;
      }, []).join('\n... ')}

      Package${namePad.slice(7)}Version
      -------${namePad.replace(/ /g, '-')}------------------
      ${Object.keys(versions)
          .map(module => `${module}${namePad.slice(module.length)}${versions[module]}`)
          .sort()
          .join('\n')}
    `.replace(/^ {6}/gm, ''));
  }

  private getVersion(
    moduleName: string,
    projectNodeModules: string | null,
    cliNodeModules: string | null,
  ): string {
    try {
      if (projectNodeModules) {
        const modulePkg = require(path.resolve(projectNodeModules, moduleName, 'package.json'));

        return modulePkg.version;
      }
    } catch (_) {
    }

    try {
      if (cliNodeModules) {
        const modulePkg = require(path.resolve(cliNodeModules, moduleName, 'package.json'));

        return modulePkg.version + ' (cli-only)';
      }
    } catch {
    }

    return '<error>';
  }
}
