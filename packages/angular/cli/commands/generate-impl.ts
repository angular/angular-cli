/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

// tslint:disable:no-global-tslint-disable no-any
import { tags, terminal } from '@angular-devkit/core';
import { SchematicCommand } from '../models/schematic-command';


export class GenerateCommand extends SchematicCommand {
  private initialized = false;
  public async initialize(options: any) {
    if (this.initialized) {
      return;
    }
    await super.initialize(options);
    this.initialized = true;

    const [collectionName, schematicName] = this.parseSchematicInfo(options);
    if (!!schematicName) {
      const schematicOptions = await this.getOptions({
        schematicName,
        collectionName,
      });
      this.addOptions(schematicOptions);
    }
  }

  validate(options: any): boolean | Promise<boolean> {
    if (!options.schematic) {
      this.logger.error(tags.oneLine`
        The "ng generate" command requires a
        schematic name to be specified.
        For more details, use "ng help".`);

      return false;
    }

    return true;
  }

  public run(options: any) {
    const [collectionName, schematicName] = this.parseSchematicInfo(options);

    // remove the schematic name from the options
    delete options.schematic;

    return this.runSchematic({
      collectionName,
      schematicName,
      schematicOptions: options,
      debug: options.debug,
      dryRun: options.dryRun,
      force: options.force,
    });
  }

  private parseSchematicInfo(options: any) {
    let collectionName = this.getDefaultSchematicCollection();

    let schematicName: string = options.schematic;

    if (schematicName) {
      if (schematicName.includes(':')) {
        [collectionName, schematicName] = schematicName.split(':', 2);
      }
    }

    return [collectionName, schematicName];
  }

  public printHelp(_name: string, _description: string, options: any) {
    const schematicName = options._[0];
    if (schematicName) {
      const optsWithoutSchematic = this.options
        .filter(o => !(o.name === 'schematic' && this.isArgument(o)));
      this.printHelpUsage(`generate ${schematicName}`, optsWithoutSchematic);
      this.printHelpOptions(this.options);
    } else {
      this.printHelpUsage('generate', this.options);
      const engineHost = this.getEngineHost();
      const [collectionName] = this.parseSchematicInfo(options);
      const collection = this.getCollection(collectionName);
      const schematicNames: string[] = engineHost.listSchematicNames(collection.description);
      this.logger.info('Available schematics:');
      schematicNames.forEach(schematicName => {
        this.logger.info(`    ${schematicName}`);
      });

      this.logger.warn(`\nTo see help for a schematic run:`);
      this.logger.info(terminal.cyan(`  ng generate <schematic> --help`));
    }
  }
}
