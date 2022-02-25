/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { strings } from '@angular-devkit/core';
import { Argv } from 'yargs';
import {
  CommandModuleImplementation,
  Options,
  OtherOptions,
} from '../../utilities/command-builder/command-module';
import {
  Option,
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

    // We cannot use `collection.listSchematicNames()` as this doesn't return hidden schematics.
    const schematicNames = new Set(Object.keys(collection.description.schematics));
    if (schematicNameFromArgs && schematicNames.has(schematicNameFromArgs)) {
      // No need to process all schematics since we know which one the user invoked.
      schematicNames.clear();
      schematicNames.add(schematicNameFromArgs);
    }

    const workspaceDefaultCollection = await this.getDefaultSchematicCollection();
    for (const schematicName of schematicNames) {
      const subcommand = await parseJsonSchemaToGenerateSubCommandDescription(
        schematicName,
        collection.createSchematic(schematicName, true),
      );

      if (!subcommand) {
        continue;
      }

      const { name, hidden, description, deprecated, aliases } = subcommand;
      const options = await this.getSchematicOptions(collection, schematicName, workflow);

      const collectionNameInCommand =
        workspaceDefaultCollection !== collectionName || !!collectionNameFromArgs;

      localYargs = localYargs.command({
        command: this.generateCommandString(collectionName, name, options, collectionNameInCommand),
        // When 'describe' is set to false, it results in a hidden command.
        describe: hidden ? false : description,
        deprecated,
        aliases,
        builder: (localYargs) => this.addSchemaOptionsToCommand(localYargs, options).strict(),
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

  private generateCommandString(
    collectionName: string,
    schematicName: string,
    options: Option[],
    collectionNameAsCommandPrefix: boolean,
  ): string {
    const positionalArgs = options
      .filter((o) => o.positional !== undefined)
      .map((o) => {
        const label = `${strings.dasherize(o.name)}${o.type === 'array' ? ' ..' : ''}`;

        return o.required ? `<${label}>` : `[${label}]`;
      })
      .join(' ');

    const commandNamePrefix = collectionNameAsCommandPrefix ? collectionName + ':' : '';

    return `${commandNamePrefix}${strings.dasherize(schematicName)}${
      positionalArgs ? ' ' + positionalArgs : ''
    }`;
  }
}
