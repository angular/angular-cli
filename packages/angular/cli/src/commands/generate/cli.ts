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
  CommandModuleError,
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

    for (const [schematicName, collectionName] of await this.getSchematicsToRegister()) {
      const workflow = this.getOrCreateWorkflowForBuilder(collectionName);
      const collection = workflow.engine.createCollection(collectionName);

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

    const [collectionName, schematicName] = this.parseSchematicInfo(schematic);

    if (!collectionName || !schematicName) {
      throw new CommandModuleError('A collection and schematic is required during execution.');
    }

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

  private async getCollectionNames(): Promise<string[]> {
    const [collectionName] = this.parseSchematicInfo(
      // positional = [generate, component] or [generate]
      this.context.args.positional[1],
    );

    return collectionName ? [collectionName] : [...(await this.getSchematicCollections())];
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
    const schematicCollectionsFromConfig = await this.getSchematicCollections();
    const collectionNames = await this.getCollectionNames();

    // Only add the collection name as part of the command when it's not a known
    // schematics collection or when it has been provided via the CLI.
    // Ex:`ng generate @schematics/angular:component`
    const commandName =
      !!collectionNameFromArgs ||
      !collectionNames.some((c) => schematicCollectionsFromConfig.has(c))
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

  /**
   * Get schematics that can to be registered as subcommands.
   */
  private async *getSchematics(): AsyncGenerator<{
    schematicName: string;
    collectionName: string;
  }> {
    const seenNames = new Set<string>();
    for (const collectionName of await this.getCollectionNames()) {
      const workflow = this.getOrCreateWorkflowForBuilder(collectionName);
      const collection = workflow.engine.createCollection(collectionName);

      for (const schematicName of collection.listSchematicNames(true /** includeHidden */)) {
        // If a schematic with this same name is already registered skip.
        if (!seenNames.has(schematicName)) {
          seenNames.add(schematicName);
          yield { schematicName, collectionName };
        }
      }
    }
  }

  /**
   * Get schematics that should to be registered as subcommands.
   *
   * @returns a sorted list of schematic that needs to be registered as subcommands.
   */
  private async getSchematicsToRegister(): Promise<
    [schematicName: string, collectionName: string][]
  > {
    const schematicsToRegister: [schematicName: string, collectionName: string][] = [];
    const [, schematicNameFromArgs] = this.parseSchematicInfo(
      // positional = [generate, component] or [generate]
      this.context.args.positional[1],
    );

    for await (const { schematicName, collectionName } of this.getSchematics()) {
      if (schematicName === schematicNameFromArgs) {
        return [[schematicName, collectionName]];
      }

      schematicsToRegister.push([schematicName, collectionName]);
    }

    // Didn't find the schematic or no schematic name was provided Ex: `ng generate --help`.
    return schematicsToRegister.sort(([nameA], [nameB]) =>
      nameA.localeCompare(nameB, undefined, { sensitivity: 'accent' }),
    );
  }
}
