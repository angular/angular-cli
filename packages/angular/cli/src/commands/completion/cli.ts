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
import { addCommandModuleToYargs } from '../../command-builder/utilities/command';
import { colors } from '../../utilities/color';
import { hasGlobalCliInstall, initializeAutocomplete } from '../../utilities/completion';
import { assertIsError } from '../../utilities/error';

export class CompletionCommandModule extends CommandModule implements CommandModuleImplementation {
  command = 'completion';
  describe = 'Set up Angular CLI autocompletion for your terminal.';
  longDescriptionPath = join(__dirname, 'long-description.md');

  builder(localYargs: Argv): Argv {
    return addCommandModuleToYargs(localYargs, CompletionScriptCommandModule, this.context);
  }

  async run(): Promise<number> {
    let rcFile: string;
    try {
      rcFile = await initializeAutocomplete();
    } catch (err) {
      assertIsError(err);
      this.context.logger.error(err.message);

      return 1;
    }

    this.context.logger.info(
      `
Appended \`source <(ng completion script)\` to \`${rcFile}\`. Restart your terminal or run the following to autocomplete \`ng\` commands:

    ${colors.yellow('source <(ng completion script)')}
      `.trim(),
    );

    if ((await hasGlobalCliInstall()) === false) {
      this.context.logger.warn(
        'Setup completed successfully, but there does not seem to be a global install of the' +
          ' Angular CLI. For autocompletion to work, the CLI will need to be on your `$PATH`, which' +
          ' is typically done with the `-g` flag in `npm install -g @angular/cli`.' +
          '\n\n' +
          'For more information, see https://angular.io/cli/completion#global-install',
      );
    }

    return 0;
  }
}

class CompletionScriptCommandModule extends CommandModule implements CommandModuleImplementation {
  command = 'script';
  describe = 'Generate a bash and zsh real-time type-ahead autocompletion script.';
  longDescriptionPath = undefined;

  builder(localYargs: Argv): Argv {
    return localYargs;
  }

  run(): void {
    yargs.showCompletionScript();
  }
}
