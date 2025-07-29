/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { join } from 'node:path';
import { Argv } from 'yargs';
import {
  CommandModule,
  CommandModuleImplementation,
  CommandScope,
  Options,
} from '../../command-builder/command-module';
import {
  addCommandModuleToYargs,
  demandCommandFailureMessage,
} from '../../command-builder/utilities/command';
import SetupGeminiCliModule from './setup-gemini-cli/cli';

export default class AiCommandModule extends CommandModule implements CommandModuleImplementation {
  command = 'ai';
  describe = 'Commands for artificial intelligence.';
  longDescriptionPath = undefined;
  override scope = CommandScope.Both;

  builder(localYargs: Argv): Argv {
    const subcommands = [SetupGeminiCliModule].sort();

    for (const module of subcommands) {
      addCommandModuleToYargs(module, this.context);
    }

    return localYargs.demandCommand(1, demandCommandFailureMessage).strict();
  }

  run(_options: Options<{}>): void {}
}
