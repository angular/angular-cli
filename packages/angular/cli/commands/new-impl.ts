/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

// tslint:disable:no-global-tslint-disable no-any
import { BaseSchematicOptions, SchematicCommand } from '../models/schematic-command';

export interface NewCommandOptions extends BaseSchematicOptions {
  skipGit?: boolean;
  collection?: string;
}


export class NewCommand extends SchematicCommand {
  public readonly allowMissingWorkspace = true;
  private schematicName = 'ng-new';

  public async run(options: NewCommandOptions) {
    if (options.dryRun) {
      options.skipGit = true;
    }

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
      debug: options.debug,
      dryRun: options.dryRun,
      force: options.force,
    });
  }

  private parseCollectionName(options: any): string {
    return options.collection || this.getDefaultSchematicCollection();
  }
}
