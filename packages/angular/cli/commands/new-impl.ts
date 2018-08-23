/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

// tslint:disable:no-global-tslint-disable no-any
import { SchematicCommand } from '../models/schematic-command';

export class NewCommand extends SchematicCommand {
  public readonly allowMissingWorkspace = true;
  private schematicName = 'ng-new';

  private initialized = false;
  public async initialize(options: any) {
    if (this.initialized) {
      return;
    }

    await super.initialize(options);

    this.initialized = true;

    const collectionName = this.parseCollectionName(options);

    const schematicOptions = await this.getOptions({
      schematicName: this.schematicName,
      collectionName,
    });
    this.addOptions(this.options.concat(schematicOptions));
  }

  public async run(options: any) {
    if (options.dryRun) {
      options.skipGit = true;
    }

    let collectionName: string;
    if (options.collection) {
      collectionName = options.collection;
    } else {
      collectionName = this.parseCollectionName(options);
    }

    const packageJson = require('../package.json');
    options.version = packageJson.version;

    // Ensure skipGit has a boolean value.
    options.skipGit = options.skipGit === undefined ? false : options.skipGit;

    options = this.removeLocalOptions(options);

    return this.runSchematic({
      collectionName: collectionName,
      schematicName: this.schematicName,
      schematicOptions: options,
      debug: options.debug,
      dryRun: options.dryRun,
      force: options.force,
    });
  }

  private parseCollectionName(options: any): string {
    const collectionName = options.collection || options.c || this.getDefaultSchematicCollection();

    return collectionName;
  }

  private removeLocalOptions(options: any): any {
    const opts = Object.assign({}, options);
    delete opts.verbose;
    delete opts.collection;

    return opts;
  }
}
