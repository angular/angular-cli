/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Collection } from '@angular-devkit/schematics';
import {
  FileSystemCollectionDescription,
  FileSystemSchematicDescription,
  NodeWorkflow,
} from '@angular-devkit/schematics/tools';
import { Argv } from 'yargs';
import { SchematicEngineHost } from '../../models/schematic-engine-host';
import { getProjectByCwd, getWorkspace } from '../utilities/config';
import { CommandModule, CommandModuleImplementation, CommandScope } from './command-module';
import { Option, parseJsonSchemaToOptions } from './utilities/json-schema';

const DEFAULT_SCHEMATICS_COLLECTION = '@schematics/angular';

export interface SchematicsCommandArgs {
  interactive: boolean;
  force: boolean;
  'dry-run': boolean;
  defaults: boolean;
}

export abstract class SchematicsCommandModule
  extends CommandModule<SchematicsCommandArgs>
  implements CommandModuleImplementation<SchematicsCommandArgs>
{
  static override scope = CommandScope.In;
  protected readonly schematicName: string | undefined;

  async builder(argv: Argv): Promise<Argv<SchematicsCommandArgs>> {
    const localYargs: Argv<SchematicsCommandArgs> = argv
      .option('interactive', {
        describe: 'Enable interactive input prompts.',
        type: 'boolean',
        default: true,
      })
      .option('dry-run', {
        describe: 'Run through and reports activity without writing out results.',
        type: 'boolean',
        default: false,
      })
      .option('defaults', {
        describe: 'Disable interactive input prompts for options with a default.',
        type: 'boolean',
        default: false,
      })
      .option('force', {
        describe: 'Force overwriting of existing files.',
        type: 'boolean',
        default: false,
      })
      .strict();

    if (this.schematicName) {
      const collectionName = await this.getCollectionName();
      const workflow = this.getOrCreateWorkflow(collectionName);
      const collection = workflow.engine.createCollection(collectionName);
      const options = await this.getSchematicOptions(collection, this.schematicName, workflow);

      return this.addSchemaOptionsToCommand(localYargs, options);
    }

    return localYargs;
  }

  /** Get schematic schema options.*/
  protected async getSchematicOptions(
    collection: Collection<FileSystemCollectionDescription, FileSystemSchematicDescription>,
    schematicName: string,
    workflow: NodeWorkflow,
  ): Promise<Option[]> {
    const schematic = collection.createSchematic(schematicName, true);
    const { schemaJson } = schematic.description;

    if (!schemaJson) {
      return [];
    }

    return parseJsonSchemaToOptions(workflow.registry, schemaJson);
  }

  protected async getCollectionName(): Promise<string> {
    const {
      options: { collection },
      positional,
    } = this.context.args;

    return (
      (typeof collection === 'string' ? collection : undefined) ??
      // positional = [generate, lint] or [new, collection-package]
      this.parseSchematicInfo(positional[1])[0] ??
      (await this.getDefaultSchematicCollection())
    );
  }

  private _workflow: NodeWorkflow | undefined;
  protected getOrCreateWorkflow(collectionName: string): NodeWorkflow {
    if (this._workflow) {
      return this._workflow;
    }

    const { root, workspace } = this.context;

    return new NodeWorkflow(root, {
      resolvePaths: workspace
        ? // Workspace
          collectionName === DEFAULT_SCHEMATICS_COLLECTION
          ? // Favor __dirname for @schematics/angular to use the build-in version
            [__dirname, process.cwd(), root]
          : [process.cwd(), root, __dirname]
        : // Global
          [__dirname, process.cwd()],
      engineHostCreator: (options) => new SchematicEngineHost(options.resolvePaths),
    });
  }

  private _defaultSchematicCollection: string | undefined;
  protected async getDefaultSchematicCollection(): Promise<string> {
    if (this._defaultSchematicCollection) {
      return this._defaultSchematicCollection;
    }

    let workspace = await getWorkspace('local');

    if (workspace) {
      const project = getProjectByCwd(workspace);
      if (project) {
        const value = workspace.getProjectCli(project)['defaultCollection'];
        if (typeof value == 'string') {
          return (this._defaultSchematicCollection = value);
        }
      }

      const value = workspace.getCli()['defaultCollection'];
      if (typeof value === 'string') {
        return (this._defaultSchematicCollection = value);
      }
    }

    workspace = await getWorkspace('global');
    const value = workspace?.getCli()['defaultCollection'];
    if (typeof value === 'string') {
      return (this._defaultSchematicCollection = value);
    }

    return (this._defaultSchematicCollection = DEFAULT_SCHEMATICS_COLLECTION);
  }

  protected parseSchematicInfo(
    schematic: string | undefined,
  ): [collectionName: string | undefined, schematicName: string | undefined] {
    if (schematic?.includes(':')) {
      const [collectionName, schematicName] = schematic.split(':', 2);

      return [collectionName, schematicName];
    }

    return [undefined, schematic];
  }
}
