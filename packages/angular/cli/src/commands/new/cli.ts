/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Argv } from 'yargs';
import {
  CommandModuleImplementation,
  CommandScope,
  Options,
  OtherOptions,
} from '../../command-builder/command-module';
import {
  SchematicsCommandArgs,
  SchematicsCommandModule,
} from '../../command-builder/schematics-command-module';
import { NewCommand } from './new-impl';

export interface NewCommandArgs extends SchematicsCommandArgs {
  collection?: string;
}

export class NewCommandModule
  extends SchematicsCommandModule
  implements CommandModuleImplementation<NewCommandArgs>
{
  protected override schematicName = 'ng-new';
  static override scope = CommandScope.Out;

  command = 'new [name]';
  aliases = 'n';
  describe = 'Creates a new Angular workspace.';
  longDescriptionPath?: string | undefined;

  override async builder(argv: Argv): Promise<Argv<NewCommandArgs>> {
    const baseYargs = await super.builder(argv);

    return baseYargs.option('collection', {
      alias: 'c',
      describe: 'A collection of schematics to use in generating the initial application.',
      type: 'string',
    });
  }

  run(options: Options<NewCommandArgs> & OtherOptions): number | void | Promise<number | void> {
    const command = new NewCommand(this.context, 'new');

    return command.validateAndRun(options);
  }
}
