/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

// tslint:disable:no-global-tslint-disable no-any
import { CommandScope, Option } from '../models/command';
import { SchematicCommand } from '../models/schematic-command';
import { getDefaultSchematicCollection } from '../utilities/config';


export default class NewCommand extends SchematicCommand {
  public readonly name = 'new';
  public readonly description =
    'Creates a new directory and a new Angular app.';
  public static aliases = ['n'];
  public scope = CommandScope.outsideProject;
  public readonly allowMissingWorkspace = true;
  public arguments: string[] = [];
  public options: Option[] = [
    ...this.coreOptions,
    {
      name: 'verbose',
      type: Boolean,
      default: false,
      aliases: ['v'],
      description: 'Adds more details to output logging.',
    },
    {
      name: 'collection',
      type: String,
      aliases: ['c'],
      description: 'Schematics collection to use.',
    },
  ];
  private schematicName = 'ng-new';

  private initialized = false;
  public initialize(options: any) {
    if (this.initialized) {
      return Promise.resolve();
    }
    super.initialize(options);
    this.initialized = true;

    const collectionName = this.parseCollectionName(options);

    return this.getOptions({
        schematicName: this.schematicName,
        collectionName,
      })
      .then((schematicOptions) => {
        this.options = this.options.concat(schematicOptions.options);
        const args = schematicOptions.arguments.map(arg => arg.name);
        this.arguments = this.arguments.concat(args);
      });
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

    const pathOptions = this.setPathOptions(options, '/');
    options = { ...options, ...pathOptions };

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
    const collectionName = options.collection || options.c || getDefaultSchematicCollection();

    return collectionName;
  }

  private removeLocalOptions(options: any): any {
    const opts = Object.assign({}, options);
    delete opts.verbose;
    delete opts.collection;

    return opts;
  }
}
