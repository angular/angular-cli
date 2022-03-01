/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { SchematicCommand } from '../../../models/schematic-command';
import { Options, OtherOptions } from '../../command-builder/command-module';
import { VERSION } from '../../utilities/version';
import { NewCommandArgs } from './cli';

type NewCommandOptions = Options<NewCommandArgs>;

export class NewCommand extends SchematicCommand<NewCommandOptions> {
  public override readonly allowMissingWorkspace = true;
  override schematicName = 'ng-new';

  override async initialize(options: NewCommandOptions) {
    this.collectionName = options.collection || (await this.getDefaultSchematicCollection());

    return super.initialize(options);
  }

  public async run(options: NewCommandOptions & OtherOptions) {
    // Register the version of the CLI in the registry.
    const version = VERSION.full;
    this._workflow.registry.addSmartDefaultProvider('ng-cli-version', () => version);

    const { dryRun, force, interactive, defaults, collection, ...schematicOptions } = options;

    return this.runSchematic({
      collectionName: this.collectionName,
      schematicName: this.schematicName,
      schematicOptions,
      debug: false,
      dryRun,
      force,
    });
  }
}
