/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { normalize } from '@angular-devkit/core';
import { Arguments, Option } from '../models/interface';
import { SchematicCommand } from '../models/schematic-command';
import { findUp } from '../utilities/find-up';
import { Schema as UpdateCommandSchema } from './update';

export class UpdateCommand extends SchematicCommand<UpdateCommandSchema> {
  public readonly allowMissingWorkspace = true;

  collectionName = '@schematics/update';
  schematicName = 'update';

  async parseArguments(schematicOptions: string[], schema: Option[]): Promise<Arguments> {
    const args = await super.parseArguments(schematicOptions, schema);
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

  async run(options: UpdateCommandSchema & Arguments) {
    return this.runSchematic({
      collectionName: this.collectionName,
      schematicName: this.schematicName,
      schematicOptions: options['--'],
      dryRun: !!options.dryRun,
      force: false,
      showNothingDone: false,
    });
  }
}
