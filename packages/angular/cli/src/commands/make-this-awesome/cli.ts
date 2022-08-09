/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Argv } from 'yargs';
import { CommandModule, CommandModuleImplementation } from '../../command-builder/command-module';
import { colors } from '../../utilities/color';

export class AwesomeCommandModule extends CommandModule implements CommandModuleImplementation {
  command = 'make-this-awesome';
  describe = false as const;
  deprecated = false;
  longDescriptionPath?: string | undefined;

  builder(localYargs: Argv): Argv {
    return localYargs;
  }

  run(): void {
    const pickOne = (of: string[]) => of[Math.floor(Math.random() * of.length)];

    const phrase = pickOne([
      `You're on it, there's nothing for me to do!`,
      `Let's take a look... nope, it's all good!`,
      `You're doing fine.`,
      `You're already doing great.`,
      `Nothing to do; already awesome. Exiting.`,
      `Error 418: As Awesome As Can Get.`,
      `I spy with my little eye a great developer!`,
      `Noop... already awesome.`,
    ]);

    this.context.logger.info(colors.green(phrase));
  }
}
