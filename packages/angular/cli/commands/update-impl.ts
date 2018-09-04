/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { normalize } from '@angular-devkit/core';
import { Arguments, Option } from '../models/interface';
import { BaseSchematicOptions, SchematicCommand } from '../models/schematic-command';
import { findUp } from '../utilities/find-up';
import { parseJsonSchemaToOptions } from '../utilities/json-schema';

export interface UpdateOptions extends BaseSchematicOptions {
  next: boolean;
  schematic?: boolean;
  dryRun: boolean;
  force: boolean;
}

type UpdateSchematicOptions = Arguments & {
  migrateOnly?: boolean;
  from?: string;
  packages?: string | string[];
};


export class UpdateCommand<T extends UpdateOptions = UpdateOptions> extends SchematicCommand<T> {
  public readonly allowMissingWorkspace = true;

  private collectionName = '@schematics/update';
  private schematicName = 'update';

  async initialize(input: T) {
    await super.initialize(input);

    // Set the options.
    const collection = this.getCollection(this.collectionName);
    const schematic = this.getSchematic(collection, this.schematicName, true);
    const options = await parseJsonSchemaToOptions(
      this._workflow.registry,
      schematic.description.schemaJson || {},
    );

    this.description.options.push(...options);
  }

  async parseArguments(schematicOptions: string[], schema: Option[]): Promise<Arguments> {
    const args = await super.parseArguments(schematicOptions, schema) as UpdateSchematicOptions;
    const maybeArgsLeftovers = args['--'];

    if (maybeArgsLeftovers
        && maybeArgsLeftovers.length == 1
        && maybeArgsLeftovers[0] == '@angular/cli'
        && args.migrateOnly === undefined
        && args.from === undefined) {
      // Check for a 1.7 angular-cli.json file.
      const oldConfigFileNames = [
        normalize('.angular-cli.json'),
        normalize('angular-cli.json'),
      ];
      const oldConfigFilePath = findUp(oldConfigFileNames, process.cwd())
                             || findUp(oldConfigFileNames, __dirname);

      if (oldConfigFilePath) {
        args.migrateOnly = true;
        args.from = '1.0.0';
      }
    }

    // Move `--` to packages.
    if (args.packages == undefined && args['--']) {
      args.packages = args['--'];
      delete args['--'];
    }

    return args;
  }

  async run(options: UpdateOptions) {
    return this.runSchematic({
      collectionName: this.collectionName,
      schematicName: this.schematicName,
      schematicOptions: options['--'],
      dryRun: options.dryRun,
      force: false,
      showNothingDone: false,
    });
  }
}
