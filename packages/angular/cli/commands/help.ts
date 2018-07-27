/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

// tslint:disable:no-global-tslint-disable no-any
import { terminal } from '@angular-devkit/core';
import { Command } from '../models/command';

interface CommandInfo {
  name: string;
  description: string;
  hidden: boolean;
  aliases: string[];
}

export class HelpCommand extends Command {
  run(options: any) {
    this.logger.info(`Available Commands:`);
    options.commandInfo
      .filter((cmd: CommandInfo) => !cmd.hidden)
      .forEach((cmd: CommandInfo) => {
        let aliasInfo = '';
        if (cmd.aliases.length > 0) {
          aliasInfo = ` (${cmd.aliases.join(', ')})`;
        }

        this.logger.info(`  ${terminal.cyan(cmd.name)}${aliasInfo} ${cmd.description}`);
      });

    this.logger.info(`\nFor more detailed help run "ng [command name] --help"`);
  }

  printHelp(_commandName: string, _description: string, options: any) {
    return this.run(options);
  }
}
