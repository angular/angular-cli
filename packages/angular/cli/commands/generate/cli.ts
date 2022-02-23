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
  Options,
  OtherOptions,
} from '../../utilities/command-builder/command-module';
import {
  addSchemaOptionsToYargs,
  parseJsonSchemaToGenerateSubCommandDescription,
} from '../../utilities/command-builder/json-schema';
import {
  SchematicsCommandArgs,
  SchematicsCommandModule,
} from '../../utilities/command-builder/schematics-command-module';
import { GenerateCommand } from './generate-impl';

export interface GenerateCommandArgs extends SchematicsCommandArgs {
  schematic?: string;
}

export class GenerateCommandModule
  extends SchematicsCommandModule
  implements CommandModuleImplementation<GenerateCommandArgs>
{
  command = 'generate [schematic]';
  aliases = 'g';
  describe = 'Generates and/or modifies files based on a schematic.';

  override async builder(argv: Argv): Promise<Argv<GenerateCommandArgs>> {
    const [collectionNameFromArgs, schematicNameFromArgs] = this.parseSchematicInfo(
      this.context.args.positional[1],
    );

    if (collectionNameFromArgs && schematicNameFromArgs) {
      this.schematicName = schematicNameFromArgs;
    }

    const baseYargs = await super.builder(argv);
    if (this.schematicName) {
      return baseYargs;
    }

    let localYargs = schematicNameFromArgs
      ? baseYargs
      : baseYargs.positional('schematic', {
          describe: 'The schematic or collection:schematic to generate.',
          type: 'string',
          demandOption: true,
        });

    const collectionName = await this.getCollectionName();
    const workflow = this.getOrCreateWorkflow(collectionName);
    const collection = workflow.engine.createCollection(collectionName);

    const schematicNames = schematicNameFromArgs ? [schematicNameFromArgs] : collection.listSchematicNames();
    const workspaceDefaultCollection = await this.getDefaultSchematicCollection();

    for (const schematicName of schematicNames) {
      const schematic = collection.createSchematic(schematicName, true);
      const subcommand = await parseJsonSchemaToGenerateSubCommandDescription(
        schematicName,
        workflow.registry,
        schematic,
        workspaceDefaultCollection === collectionName ? undefined : collectionName,
      );

      if (!subcommand) {
        continue;
      }

      const { command, hidden, description, deprecated, aliases, options } = subcommand;
      const { help } = this.context.args.options;

      localYargs = localYargs.command({
        command,
        // When 'describe' is set to false, it results in a hidden command.
        describe: hidden ? false : description,
        deprecated,
        aliases,
        builder: (localYargs) => addSchemaOptionsToYargs(localYargs, options, help).strict(),
        handler: (options) =>
          this.handler({ ...options, schematic: `${collectionName}:${schematicName}` }),
      });
    }

    return localYargs;
  }

  run(
    options: Options<GenerateCommandArgs> & OtherOptions,
  ): number | void | Promise<number | void> {
    const command = new GenerateCommand(this.context, 'generate');

    return command.validateAndRun(options);
  }
}
