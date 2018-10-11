/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

// tslint:disable:no-global-tslint-disable no-any
import { terminal } from '@angular-devkit/core';
import { Arguments, SubCommandDescription } from '../models/interface';
import { SchematicCommand } from '../models/schematic-command';
import { parseJsonSchemaToSubCommandDescription } from '../utilities/json-schema';
import { Schema as GenerateCommandSchema } from './generate';

export class GenerateCommand extends SchematicCommand<GenerateCommandSchema> {
  async initialize(options: GenerateCommandSchema & Arguments) {
    await super.initialize(options);

    // Fill up the schematics property of the command description.
    const [collectionName, schematicName] = this.parseSchematicInfo(options);

    const collection = this.getCollection(collectionName);
    const subcommands: { [name: string]: SubCommandDescription } = {};

    const schematicNames = schematicName ? [schematicName] : collection.listSchematicNames();
    // Sort as a courtesy for the user.
    schematicNames.sort();

    for (const name of schematicNames) {
      const schematic = this.getSchematic(collection, name, true);
      let subcommand: SubCommandDescription;
      if (schematic.description.schemaJson) {
        subcommand = await parseJsonSchemaToSubCommandDescription(
          name,
          schematic.description.path,
          this._workflow.registry,
          schematic.description.schemaJson,
        );
      } else {
        continue;
      }

      if (this.getDefaultSchematicCollection() == collectionName) {
        subcommands[name] = subcommand;
      } else {
        subcommands[`${collectionName}:${name}`] = subcommand;
      }
    }

    this.description.options.forEach(option => {
      if (option.name == 'schematic') {
        option.subcommands = subcommands;
      }
    });
  }

  public async run(options: GenerateCommandSchema & Arguments) {
    const [collectionName, schematicName] = this.parseSchematicInfo(options);

    if (!schematicName || !collectionName) {
      return this.printHelp(options);
    }

    return this.runSchematic({
      collectionName,
      schematicName,
      schematicOptions: options['--'] || [],
      debug: !!options.debug || false,
      dryRun: !!options.dryRun || false,
      force: !!options.force || false,
    });
  }

  private parseSchematicInfo(options: { schematic?: string }): [string, string | undefined] {
    let collectionName = this.getDefaultSchematicCollection();

    let schematicName = options.schematic;

    if (schematicName) {
      if (schematicName.includes(':')) {
        [collectionName, schematicName] = schematicName.split(':', 2);
      }
    }

    return [collectionName, schematicName];
  }

  public async printHelp(options: GenerateCommandSchema & Arguments) {
    await super.printHelp(options);

    this.logger.info('');
    // Find the generate subcommand.
    const subcommand = this.description.options.filter(x => x.subcommands)[0];
    if (Object.keys((subcommand && subcommand.subcommands) || {}).length == 1) {
      this.logger.info(`\nTo see help for a schematic run:`);
      this.logger.info(terminal.cyan(`  ng generate <schematic> --help`));
    }

    return 0;
  }
}
