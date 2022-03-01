/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { SchematicCommand } from '../../../models/schematic-command';
import { Options, OtherOptions } from '../../command-builder/command-module';
import { GenerateCommandArgs } from './cli';

type GenerateCommandOptions = Options<GenerateCommandArgs>;

export class GenerateCommand extends SchematicCommand<GenerateCommandOptions> {
  // Allows us to resolve aliases before reporting analytics
  longSchematicName: string | undefined;

  override async initialize(options: GenerateCommandOptions) {
    // Fill up the schematics property of the command description.
    const [collectionName, schematicName] = await this.parseSchematicInfo(options.schematic);
    this.collectionName = collectionName ?? (await this.getDefaultSchematicCollection());
    this.schematicName = schematicName;

    await super.initialize(options);
  }

  public async run(options: GenerateCommandOptions & OtherOptions) {
    if (!this.schematicName || !this.collectionName) {
      return 1;
    }

    const { dryRun, force, interactive, defaults, schematic, ...schematicOptions } = options;

    return this.runSchematic({
      collectionName: this.collectionName,
      schematicName: this.schematicName,
      schematicOptions: schematicOptions,
      debug: false,
      dryRun,
      force,
    });
  }

  override async reportAnalytics(paths: string[], options: GenerateCommandOptions): Promise<void> {
    if (!this.collectionName || !this.schematicName) {
      return;
    }
    const escapedSchematicName = (this.longSchematicName || this.schematicName).replace(/\//g, '_');

    return super.reportAnalytics(
      ['generate', this.collectionName.replace(/\//g, '_'), escapedSchematicName],
      options,
    );
  }

  private parseSchematicInfo(
    schematic: string | undefined,
  ): [collectionName: string | undefined, schematicName: string | undefined] {
    if (schematic?.includes(':')) {
      const [collectionName, schematicName] = schematic.split(':', 2);

      return [collectionName, schematicName];
    }

    return [undefined, schematic];
  }
}
