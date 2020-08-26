/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Command } from '../models/command';
import { colors } from '../utilities/color';
import { Schema as HelpCommandSchema } from './help';

export class HelpCommand extends Command<HelpCommandSchema> {
  async run() {
    this.logger.info(`Available Commands:`);

    for (const cmd of Object.values(await Command.commandMap())) {
      if (cmd.hidden) {
        continue;
      }

      const aliasInfo = cmd.aliases.length > 0 ? ` (${cmd.aliases.join(', ')})` : '';
      this.logger.info(`  ${colors.cyan(cmd.name)}${aliasInfo} ${cmd.description}`);
    }
    this.logger.info(`\nFor more detailed help run "ng [command name] --help"`);
  }
}
