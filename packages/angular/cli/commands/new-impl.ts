/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

// tslint:disable:no-global-tslint-disable no-any
import { Arguments } from '../models/interface';
import { SchematicCommand } from '../models/schematic-command';
import { Schema as NewCommandSchema } from './new';


export class NewCommand extends SchematicCommand<NewCommandSchema> {
  public readonly allowMissingWorkspace = true;
  schematicName = 'ng-new';

  async initialize(options: NewCommandSchema & Arguments) {
    if (options.collection) {
      this.collectionName = options.collection;
    } else {
      this.collectionName = await this.parseCollectionName(options);
    }

    return super.initialize(options);
  }

  public async run(options: NewCommandSchema & Arguments) {
    // Register the version of the CLI in the registry.
    const packageJson = require('../package.json');
    const version = packageJson.version;

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

  private async parseCollectionName(options: any): Promise<string> {
    return options.collection || this.getDefaultSchematicCollection();
  }
}
