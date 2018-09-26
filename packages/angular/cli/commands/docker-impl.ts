/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

// tslint:disable:no-global-tslint-disable no-any
import { execSync } from 'child_process';
import { Arguments } from '../models/interface';
import { SchematicCommand } from '../models/schematic-command';
import { parseJsonSchemaToSubCommandDescription } from '../utilities/json-schema';
import { Action, Schema as DockerCommandSchema } from './docker';

export class DockerCommand extends SchematicCommand<DockerCommandSchema> {

  public async initialize(options: DockerCommandSchema & Arguments) {
    await super.initialize(options);

    this.schematicName = 'docker';

    if (options.action === Action.Init && options.help) {
      const collection = this.getCollection(this.collectionName);
      const schematic = this.getSchematic(collection, this.schematicName, true);

      if (schematic.description.schemaJson) {
        const subcommand = await parseJsonSchemaToSubCommandDescription(
          this.schematicName,
          schematic.description.path,
          this._workflow.registry,
          schematic.description.schemaJson,
          this.logger,
        );

        if (subcommand) {
          subcommand.options.sort();
          this.description.options = [...this.description.options, ...subcommand.options];
        }
      }
    }

    this.dockerCliExistChecker();
  }

  public async run(options: DockerCommandSchema & Arguments) {

    if (!this.schematicName) {
      throw Error('Schematic name is required but is it empty!');
    }

    switch (options.action) {
      case  Action.Init:
        return await this.runSchematic({
          collectionName: this.collectionName,
          schematicName: this.schematicName,
          schematicOptions: options['--'] || [],
          debug: !!options.debug || false,
          dryRun: !!options.dryRun || false,
          force: !!options.force || false,
        });
      default:
        await this.printHelp(options);
    }
  }

  private dockerCliExistChecker() {
    try {
      /**
       * Checking for the default docker-cli existance in the machine.
       * Stdio removes all the output
       */
      execSync('docker', { stdio: [] });
    } catch (err) {
      this.logger.info('');
      this.logger.warn('Docker-CLI is available on https://docs.docker.com/install/');
      throw Error('Docker-CLI is missing!');
    }
  }
}
