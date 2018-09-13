/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

// tslint:disable:no-global-tslint-disable no-any
import { terminal } from '@angular-devkit/core';
import { Arguments, Option } from '../models/interface';
import { SchematicCommand } from '../models/schematic-command';
import { parseJsonSchemaToOptions } from '../utilities/json-schema';
import { Schema as GenerateCommandSchema } from './generate';

export class GenerateCommand extends SchematicCommand<GenerateCommandSchema> {
  async initialize(options: GenerateCommandSchema & Arguments) {
    await super.initialize(options);

    // Fill up the schematics property of the command description.
    const [collectionName, schematicName] = this.parseSchematicInfo(options);

    const collection = this.getCollection(collectionName);
    this.description.suboptions = {};

    const schematicNames = schematicName ? [schematicName] : collection.listSchematicNames();
    // Sort as a courtesy for the user.
    schematicNames.sort();

    for (const name of schematicNames) {
      const schematic = this.getSchematic(collection, name, true);
      let options: Option[] = [];
      if (schematic.description.schemaJson) {
        options = await parseJsonSchemaToOptions(
          this._workflow.registry,
          schematic.description.schemaJson,
        );
      }

      if (this.getDefaultSchematicCollection() == collectionName) {
        this.description.suboptions[name] = options;
      } else {
        this.description.suboptions[`${collectionName}:${name}`] = options;
      }
    }

    this.description.options.forEach(option => {
      if (option.name == 'schematic') {
        option.type = 'suboption';
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
    if (Object.keys(this.description.suboptions || {}).length == 1) {
      this.logger.info(`\nTo see help for a schematic run:`);
      this.logger.info(terminal.cyan(`  ng generate <schematic> --help`));
    }

    return 0;
  }
}
