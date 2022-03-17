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
} from '../../command-builder/command-module';
import {
  SchematicsCommandArgs,
  SchematicsCommandModule,
} from '../../command-builder/schematics-command-module';
import { demandCommandFailureMessage } from '../../command-builder/utilities/command';
import { Option } from '../../command-builder/utilities/json-schema';

interface GenerateCommandArgs extends SchematicsCommandArgs {
  schematic?: string;
}

export class GenerateCommandModule
  extends SchematicsCommandModule
  implements CommandModuleImplementation<GenerateCommandArgs>
{
  command = 'generate';
  aliases = 'g';
  describe = 'Generates and/or modifies files based on a schematic.';
  longDescriptionPath?: string | undefined;

  override async builder(argv: Argv): Promise<Argv<GenerateCommandArgs>> {
    let localYargs = (await super.builder(argv)).command<GenerateCommandArgs>({
      command: '$0 <schematic>',
      describe: 'Run the provided schematic.',
      builder: (localYargs) =>
        localYargs
          .positional('schematic', {
            describe: 'The [collection:schematic] to run.',
            type: 'string',
            demandOption: true,
          })
          .strict(),
      handler: (options) => this.handler(options),
    });

    const collectionName = await this.getCollectionName();
    const workflow = this.getOrCreateWorkflowForBuilder(collectionName);
    const collection = workflow.engine.createCollection(collectionName);
    const schematicsInCollection = collection.description.schematics;

    // We cannot use `collection.listSchematicNames()` as this doesn't return hidden schematics.
    const schematicNames = new Set(Object.keys(schematicsInCollection).sort());
    const [, schematicNameFromArgs] = this.parseSchematicInfo(
      // positional = [generate, component] or [generate]
      this.context.args.positional[1],
    );

    if (schematicNameFromArgs && schematicNames.has(schematicNameFromArgs)) {
      // No need to process all schematics since we know which one the user invoked.
      schematicNames.clear();
      schematicNames.add(schematicNameFromArgs);
    }

    for (const schematicName of schematicNames) {
      if (schematicsInCollection[schematicName].private) {
        continue;
      }

      const {
        description: {
          schemaJson,
          aliases: schematicAliases,
          hidden: schematicHidden,
          description: schematicDescription,
        },
      } = collection.createSchematic(schematicName, true);

      if (!schemaJson) {
        continue;
      }

      const {
        'x-deprecated': xDeprecated,
        description = schematicDescription,
        aliases = schematicAliases,
        hidden = schematicHidden,
      } = schemaJson;
      const options = await this.getSchematicOptions(collection, schematicName, workflow);

      localYargs = localYargs.command({
        command: await this.generateCommandString(collectionName, schematicName, options),
        // When 'describe' is set to false, it results in a hidden command.
        describe: hidden === true ? false : typeof description === 'string' ? description : '',
        deprecated: xDeprecated === true || typeof xDeprecated === 'string' ? xDeprecated : false,
        aliases: Array.isArray(aliases) ? (aliases as string[]) : undefined,
        builder: (localYargs) => this.addSchemaOptionsToCommand(localYargs, options).strict(),
        handler: (options) =>
          this.handler({ ...options, schematic: `${collectionName}:${schematicName}` }),
      });
    }

    return localYargs.demandCommand(1, demandCommandFailureMessage);
  }

  async run(options: Options<GenerateCommandArgs> & OtherOptions): Promise<number | void> {
    const { dryRun, schematic, defaults, force, interactive, ...schematicOptions } = options;

    const [collectionName = await this.getCollectionName(), schematicName = ''] =
      this.parseSchematicInfo(schematic);

    return this.runSchematic({
      collectionName,
      schematicName,
      schematicOptions,
      executionOptions: {
        dryRun,
        defaults,
        force,
        interactive,
      },
    });
  }

  private async getCollectionName(): Promise<string> {
    const [collectionName = await this.getDefaultSchematicCollection()] = this.parseSchematicInfo(
      // positional = [generate, component] or [generate]
      this.context.args.positional[1],
    );

    return collectionName;
  }

  /**
   * Generate a command string to be passed to the command builder.
   *
   * @example `component [name]` or `@schematics/angular:component [name]`.
   */
  private async generateCommandString(
    collectionName: string,
    schematicName: string,
    options: Option[],
  ): Promise<string> {
    const [collectionNameFromArgs] = this.parseSchematicInfo(
      // positional = [generate, component] or [generate]
      this.context.args.positional[1],
    );

    const dasherizedSchematicName = strings.dasherize(schematicName);

    // Only add the collection name as part of the command when it's not the default collection or when it has been provided via the CLI.
    // Ex:`ng generate @schematics/angular:component`
    const commandName =
      !!collectionNameFromArgs ||
      (await this.getDefaultSchematicCollection()) !== (await this.getCollectionName())
        ? collectionName + ':' + dasherizedSchematicName
        : dasherizedSchematicName;

    const positionalArgs = options
      .filter((o) => o.positional !== undefined)
      .map((o) => {
        const label = `${strings.dasherize(o.name)}${o.type === 'array' ? ' ..' : ''}`;

        return o.required ? `<${label}>` : `[${label}]`;
      })
      .join(' ');

    return `${commandName}${positionalArgs ? ' ' + positionalArgs : ''}`;
  }
}
