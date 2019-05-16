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

  public async run(options: NewCommandSchema & Arguments) {
    let collectionName: string;
    if (options.collection) {
      collectionName = options.collection;
    } else {
      collectionName = this.parseCollectionName(options);
    }

    // Register the version of the CLI in the registry.
    const packageJson = require('../package.json');
    const version = packageJson.version;

    this._workflow.registry.addSmartDefaultProvider('ng-cli-version', () => version);

    return this.runSchematic({
      collectionName: collectionName,
      schematicName: this.schematicName,
      schematicOptions: options['--'] || [],
      debug: !!options.debug,
      dryRun: !!options.dryRun,
      force: !!options.force,
    });
  }

  private parseCollectionName(options: any): string {
    return options.collection || this.getDefaultSchematicCollection();
  }
}
