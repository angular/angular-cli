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
import { gatherVersionInfo } from './version-info';

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
    return localYargs.option('json', {
      describe: 'Outputs version information in JSON format.',
      type: 'boolean',
    });
  }

  /**
   * The main execution logic for the `ng version` command.
   */
  async run(options: { json?: boolean }): Promise<void> {
    const { logger } = this.context;
    const versionInfo = gatherVersionInfo(this.context);

    if (options.json) {
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(versionInfo, null, 2));

      return;
    }

    const {
      cli: { version: ngCliVersion },
      system: {
        node: { version: nodeVersion, unsupported: unsupportedNodeVersion },
        os: { platform: os, architecture: arch },
        packageManager: { name: packageManagerName, version: packageManagerVersion },
      },
      packages,
    } = versionInfo;

    const headerInfo = [
      { label: 'Angular CLI', value: ngCliVersion },
      {
        label: 'Node.js',
        value: `${nodeVersion}${unsupportedNodeVersion ? colors.yellow(' (Unsupported)') : ''}`,
      },
      {
        label: 'Package Manager',
        value: `${packageManagerName} ${packageManagerVersion ?? '<error>'}`,
      },
      { label: 'Operating System', value: `${os} ${arch}` },
    ];

    const maxHeaderLabelLength = Math.max(...headerInfo.map((l) => l.label.length));

    const header = headerInfo
      .map(
        ({ label, value }) =>
          colors.bold(label.padEnd(maxHeaderLabelLength + 2)) + `: ${colors.cyan(value)}`,
      )
      .join('\n');

    const packageTable = this.formatPackageTable(packages);

    logger.info([ASCII_ART, header, packageTable].join('\n\n'));

    if (unsupportedNodeVersion) {
      logger.warn(
        `Warning: The current version of Node (${nodeVersion}) is not supported by Angular.`,
      );
    }
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

    const nameHeader = 'Package';
    const versionHeader = 'Version';

    const maxNameLength = Math.max(nameHeader.length, ...versionKeys.map((key) => key.length));
    const maxVersionLength = Math.max(
      versionHeader.length,
      ...versionKeys.map((key) => versions[key].length),
    );

    const tableRows = versionKeys
      .map((module) => {
        const name = module.padEnd(maxNameLength);
        const version = versions[module];
        const coloredVersion = version === '<error>' ? colors.red(version) : colors.cyan(version);
        const padding = ' '.repeat(maxVersionLength - version.length);

        return `│ ${name} │ ${coloredVersion}${padding} │`;
      })
      .sort();

    const top = `┌─${'─'.repeat(maxNameLength)}─┬─${'─'.repeat(maxVersionLength)}─┐`;
    const header = `│ ${nameHeader.padEnd(maxNameLength)} │ ${versionHeader.padEnd(
      maxVersionLength,
    )} │`;
    const separator = `├─${'─'.repeat(maxNameLength)}─┼─${'─'.repeat(maxVersionLength)}─┤`;
    const bottom = `└─${'─'.repeat(maxNameLength)}─┴─${'─'.repeat(maxVersionLength)}─┘`;

    return [top, header, separator, ...tableRows, bottom].join('\n');
  }
}
