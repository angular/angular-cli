/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { Argv } from 'yargs';
import { CommandModule, CommandModuleImplementation } from '../../command-builder/command-module';
import { colors } from '../../utilities/color';
import { RootCommands } from '../command-config';
import { VersionInfo, gatherVersionInfo } from './version-info';

/**
 * The Angular CLI logo, displayed as ASCII art.
 */
const ASCII_ART = `
     _                      _                 ____ _     ___
    / \\   _ __   __ _ _   _| | __ _ _ __     / ___| |   |_ _|
   / △ \\ | '_ \\ / _\` | | | | |/ _\` | '__|   | |   | |    | |
  / ___ \\| | | | (_| | |_| | | (_| | |      | |___| |___ | |
 /_/   \\_\\_| |_|\\__, |\\__,_|_|\\__,_|_|       \\____|_____|___|
                |___/
    `
  .split('\n')
  .map((x) => colors.red(x))
  .join('\n');

/**
 * The command-line module for the `ng version` command.
 */
export default class VersionCommandModule
  extends CommandModule
  implements CommandModuleImplementation
{
  command = 'version';
  aliases = RootCommands['version'].aliases;
  describe = 'Outputs Angular CLI version.';
  longDescriptionPath?: string | undefined;

  /**
   * Builds the command-line options for the `ng version` command.
   * @param localYargs The `yargs` instance to configure.
   * @returns The configured `yargs` instance.
   */
  builder(localYargs: Argv): Argv {
    return localYargs;
  }

  /**
   * The main execution logic for the `ng version` command.
   */
  async run(): Promise<void> {
    const { logger } = this.context;
    const versionInfo = gatherVersionInfo(this.context);
    const {
      ngCliVersion,
      nodeVersion,
      unsupportedNodeVersion,
      packageManagerName,
      packageManagerVersion,
      os,
      arch,
      versions,
    } = versionInfo;

    const header = `
      Angular CLI: ${ngCliVersion}
      Node: ${nodeVersion}${unsupportedNodeVersion ? ' (Unsupported)' : ''}
      Package Manager: ${packageManagerName} ${packageManagerVersion ?? '<error>'}
      OS: ${os} ${arch}
    `.replace(/^ {6}/gm, '');

    const angularPackages = this.formatAngularPackages(versionInfo);
    const packageTable = this.formatPackageTable(versions);

    logger.info([ASCII_ART, header, angularPackages, packageTable].join('\n\n'));

    if (unsupportedNodeVersion) {
      logger.warn(
        `Warning: The current version of Node (${nodeVersion}) is not supported by Angular.`,
      );
    }
  }

  /**
   * Formats the Angular packages section of the version output.
   * @param versionInfo An object containing the version information.
   * @returns A string containing the formatted Angular packages information.
   */
  private formatAngularPackages(versionInfo: VersionInfo): string {
    const { angularCoreVersion, angularSameAsCore } = versionInfo;
    if (!angularCoreVersion) {
      return 'Angular: <error>';
    }

    const wrappedPackages = angularSameAsCore
      .reduce<string[]>((acc, name) => {
        if (acc.length === 0) {
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
      .join('\n... ');

    return `Angular: ${angularCoreVersion}\n... ${wrappedPackages}`;
  }

  /**
   * Formats the package table section of the version output.
   * @param versions A map of package names to their versions.
   * @returns A string containing the formatted package table.
   */
  private formatPackageTable(versions: Record<string, string>): string {
    const versionKeys = Object.keys(versions);
    if (versionKeys.length === 0) {
      return '';
    }

    const header = 'Package';
    const maxNameLength = Math.max(...versionKeys.map((key) => key.length));
    const namePad = ' '.repeat(Math.max(0, maxNameLength - header.length) + 3);

    const tableHeader = `${header}${namePad}Version`;
    const separator = '-'.repeat(tableHeader.length);

    const tableRows = versionKeys
      .map((module) => {
        const padding = ' '.repeat(maxNameLength - module.length + 3);

        return `${module}${padding}${versions[module]}`;
      })
      .sort()
      .join('\n');

    return `${tableHeader}\n${separator}\n${tableRows}`;
  }
}
