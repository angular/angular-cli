/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Arguments } from '../models/interface';
import { SchematicCommand } from '../models/schematic-command';
import { VERSION } from '../models/version';
import { Schema as NewCommandSchema } from './new';

export class NewCommand extends SchematicCommand<NewCommandSchema> {
  public override readonly allowMissingWorkspace = true;
  override schematicName = 'ng-new';

  override async initialize(options: NewCommandSchema & Arguments) {
    this.collectionName = options.collection || (await this.getDefaultSchematicCollection());

    return super.initialize(options);
  }

  public async run(options: NewCommandSchema & Arguments) {
    // Register the version of the CLI in the registry.
    const version = VERSION.full;
    this._workflow.registry.addSmartDefaultProvider('ng-cli-version', () => version);

    return this.runSchematic({
      collectionName: this.collectionName,
      schematicName: this.schematicName,
      schematicOptions: options['--'] || [],
      debug: !!options.debug,
      dryRun: !!options.dryRun,
      force: !!options.force,
    });
  }
}
