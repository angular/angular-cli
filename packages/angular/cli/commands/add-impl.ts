/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

// tslint:disable:no-global-tslint-disable no-any
import { tags, terminal } from '@angular-devkit/core';
import { NodePackageDoesNotSupportSchematics } from '@angular-devkit/schematics/tools';
import { Arguments } from '../models/interface';
import { SchematicCommand } from '../models/schematic-command';
import { NpmInstall } from '../tasks/npm-install';
import { getPackageManager } from '../utilities/package-manager';
import { Schema as AddCommandSchema } from './add';

export class AddCommand extends SchematicCommand<AddCommandSchema> {
  readonly allowPrivateSchematics = true;

  async run(options: AddCommandSchema & Arguments) {
    if (!options.collection) {
      this.logger.fatal(
        `The "ng add" command requires a name argument to be specified eg. `
        + `${terminal.yellow('ng add [name] ')}. For more details, use "ng help".`,
      );

      return 1;
    }

    const packageManager = getPackageManager(this.workspace.root);

    const npmInstall: NpmInstall = require('../tasks/npm-install').default;

    const packageName = options.collection.startsWith('@')
      ? options.collection.split('/', 2).join('/')
      : options.collection.split('/', 1)[0];

    // Remove the tag/version from the package name.
    const collectionName = (
      packageName.startsWith('@')
        ? packageName.split('@', 2).join('@')
        : packageName.split('@', 1).join('@')
    ) + options.collection.slice(packageName.length);

    // We don't actually add the package to package.json, that would be the work of the package
    // itself.
    await npmInstall(
      packageName,
      this.logger,
      packageManager,
      this.workspace.root,
    );

    const runOptions = {
      schematicOptions: options['--'] || [],
      workingDir: this.workspace.root,
      collectionName,
      schematicName: 'ng-add',
      allowPrivate: true,
      dryRun: false,
      force: false,
    };

    try {
      return await this.runSchematic(runOptions);
    } catch (e) {
      if (e instanceof NodePackageDoesNotSupportSchematics) {
        this.logger.error(tags.oneLine`
          The package that you are trying to add does not support schematics. You can try using
          a different version of the package or contact the package author to add ng-add support.
        `);

        return 1;
      }

      throw e;
    }
  }
}
