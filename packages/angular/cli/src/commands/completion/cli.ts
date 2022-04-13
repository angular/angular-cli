/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { join } from 'path';
import yargs, { Argv } from 'yargs';
import { CommandModule, CommandModuleImplementation } from '../../command-builder/command-module';

export class CompletionCommandModule extends CommandModule implements CommandModuleImplementation {
  command = 'completion';
  describe = 'Generate a bash and zsh real-time type-ahead autocompletion script.';
  longDescriptionPath = join(__dirname, 'long-description.md');

  builder(localYargs: Argv): Argv {
    return localYargs;
  }

  run(): void {
    yargs.showCompletionScript();
  }
}
