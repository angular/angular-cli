/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

// tslint:disable:no-global-tslint-disable no-any
import { terminal } from '@angular-devkit/core';
import { Option } from '../models/interface';
import { BaseSchematicOptions, SchematicCommand } from '../models/schematic-command';
import { parseJsonSchemaToOptions } from '../utilities/json-schema';

export interface GenerateCommandOptions extends BaseSchematicOptions {
  schematic?: string;
}

export class GenerateCommand<
  T extends GenerateCommandOptions = GenerateCommandOptions,
> extends SchematicCommand<T> {
  async initialize(options: T) {
    await super.initialize(options);

    // Fill up the schematics property of the command description.
    const [collectionName, schematicName] = this.parseSchematicInfo(options);

    const collection = this.getCollection(collectionName);
    this.description.suboptions = {};

    const schematicNames = schematicName ? [schematicName] : collection.listSchematicNames();

    for (const name of schematicNames) {
      const schematic = this.getSchematic(collection, name, true);
      let options: Option[] = [];
      if (schematic.description.schemaJson) {
        options = await parseJsonSchemaToOptions(
          this._workflow.registry,
          schematic.description.schemaJson,
        );
      }

      this.description.suboptions[`${collectionName}:${name}`] = options;
    }
  }

  public async run(options: T) {
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

  public async printHelp(options: T) {
    await super.printHelp(options);

    if (Object.keys(this.description.suboptions || {}).length == 1) {
      this.logger.info(`\nTo see help for a schematic run:`);
      this.logger.info(terminal.cyan(`  ng generate <schematic> --help`));
    }

    return 0;
  }
}
