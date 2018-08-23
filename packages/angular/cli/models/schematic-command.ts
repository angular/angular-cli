/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

// tslint:disable:no-global-tslint-disable no-any
import {
  JsonObject,
  experimental,
  logging,
  normalize,
  schema,
  strings,
  tags,
  terminal,
  virtualFs,
} from '@angular-devkit/core';
import { NodeJsSyncHost } from '@angular-devkit/core/node';
import {
  Collection,
  DryRunEvent,
  Engine,
  Schematic,
  SchematicEngine,
  UnsuccessfulWorkflowExecution,
  formats,
  workflow,
} from '@angular-devkit/schematics';
import {
  FileSystemCollectionDesc,
  FileSystemEngineHostBase,
  FileSystemSchematicDesc,
  NodeModulesEngineHost,
  NodeWorkflow,
  validateOptionsWithSchema,
} from '@angular-devkit/schematics/tools';
import { take } from 'rxjs/operators';
import { WorkspaceLoader } from '../models/workspace-loader';
import {
  getPackageManager,
  getProjectByCwd,
  getSchematicDefaults,
  getWorkspace,
} from '../utilities/config';
import { ArgumentStrategy, Command, CommandContext, Option } from './command';

export interface CoreSchematicOptions {
  dryRun: boolean;
  force: boolean;
}

export interface RunSchematicOptions {
  collectionName: string;
  schematicName: string;
  schematicOptions: any;
  debug?: boolean;
  dryRun: boolean;
  force: boolean;
  showNothingDone?: boolean;
}

export interface GetOptionsOptions {
  collectionName: string;
  schematicName: string;
}

export interface GetOptionsResult {
  options: Option[];
  arguments: Option[];
}

export class UnknownCollectionError extends Error {
  constructor(collectionName: string) {
    super(`Invalid collection (${collectionName}).`);
  }
}

export abstract class SchematicCommand extends Command {
  readonly options: Option[] = [];
  readonly allowPrivateSchematics: boolean = false;
  private _host = new NodeJsSyncHost();
  private _workspace: experimental.workspace.Workspace;
  private _deAliasedName: string;
  private _originalOptions: Option[];
  private _engineHost: FileSystemEngineHostBase;
  private _engine: Engine<FileSystemCollectionDesc, FileSystemSchematicDesc>;
  private _workflow: workflow.BaseWorkflow;
  argStrategy = ArgumentStrategy.Nothing;

  constructor(
      context: CommandContext, logger: logging.Logger,
      engineHost: FileSystemEngineHostBase = new NodeModulesEngineHost()) {
    super(context, logger);
    this._engineHost = engineHost;
    this._engine = new SchematicEngine(this._engineHost);
    const registry = new schema.CoreSchemaRegistry(formats.standardFormats);
    this._engineHost.registerOptionsTransform(
        validateOptionsWithSchema(registry));
  }

  protected readonly coreOptions: Option[] = [
    {
      name: 'dryRun',
      type: 'boolean',
      default: false,
      aliases: ['d'],
      description: 'Run through without making any changes.',
    },
    {
      name: 'force',
      type: 'boolean',
      default: false,
      aliases: ['f'],
      description: 'Forces overwriting of files.',
    }];

  public async initialize(_options: any) {
    this._loadWorkspace();
  }

  protected getEngineHost() {
    return this._engineHost;
  }
  protected getEngine():
      Engine<FileSystemCollectionDesc, FileSystemSchematicDesc> {
    return this._engine;
  }

  protected getCollection(collectionName: string): Collection<any, any> {
    const engine = this.getEngine();
    const collection = engine.createCollection(collectionName);

    if (collection === null) {
      throw new UnknownCollectionError(collectionName);
    }

    return collection;
  }

  protected getSchematic(
      collection: Collection<any, any>, schematicName: string,
      allowPrivate?: boolean): Schematic<any, any> {
    return collection.createSchematic(schematicName, allowPrivate);
  }

  protected setPathOptions(options: any, workingDir: string): any {
    if (workingDir === '') {
      return {};
    }

    return this.options
      .filter(o => o.format === 'path')
      .map(o => o.name)
      .filter(name => options[name] === undefined)
      .reduce((acc: any, curr) => {
        acc[curr] = workingDir;

        return acc;
      }, {});
  }

  /*
   * Runtime hook to allow specifying customized workflow
   */
  protected getWorkflow(options: RunSchematicOptions): workflow.BaseWorkflow {
    const {force, dryRun} = options;
    const fsHost = new virtualFs.ScopedHost(
        new NodeJsSyncHost(), normalize(this.project.root));

    return new NodeWorkflow(
        fsHost as any,
        {
          force,
          dryRun,
          packageManager: getPackageManager(),
          root: this.project.root,
        },
    );
  }

  private _getWorkflow(options: RunSchematicOptions): workflow.BaseWorkflow {
    if (!this._workflow) {
      this._workflow = this.getWorkflow(options);
    }

    return this._workflow;
  }

  protected getDefaultSchematicCollection(): string {
    let workspace = getWorkspace('local');

    if (workspace) {
      const project = getProjectByCwd(workspace);
      if (project && workspace.getProjectCli(project)) {
        const value = workspace.getProjectCli(project)['defaultCollection'];
        if (typeof value == 'string') {
          return value;
        }
      }
      if (workspace.getCli()) {
        const value = workspace.getCli()['defaultCollection'];
        if (typeof value == 'string') {
          return value;
        }
      }
    }

    workspace = getWorkspace('global');
    if (workspace && workspace.getCli()) {
      const value = workspace.getCli()['defaultCollection'];
      if (typeof value == 'string') {
        return value;
      }
    }

    return '@schematics/angular';
  }

  protected runSchematic(options: RunSchematicOptions) {
    const {collectionName, schematicName, debug, dryRun} = options;
    let schematicOptions = this.removeCoreOptions(options.schematicOptions);
    let nothingDone = true;
    let loggingQueue: string[] = [];
    let error = false;
    const workflow = this._getWorkflow(options);

    const workingDir = process.cwd().replace(this.project.root, '').replace(/\\/g, '/');
    const pathOptions = this.setPathOptions(schematicOptions, workingDir);
    schematicOptions = { ...schematicOptions, ...pathOptions };
    const defaultOptions = this.readDefaults(collectionName, schematicName, schematicOptions);
    schematicOptions = { ...schematicOptions, ...defaultOptions };

    // Remove all of the original arguments which have already been parsed

    const argumentCount = this._originalOptions
      .filter(opt => {
        let isArgument = false;
        if (opt.$default !== undefined && opt.$default.$source === 'argv') {
          isArgument = true;
        }

        return isArgument;
      })
      .length;

    // Pass the rest of the arguments as the smart default "argv". Then delete it.
    const rawArgs = schematicOptions._.slice(argumentCount);
    workflow.registry.addSmartDefaultProvider('argv', (schema: JsonObject) => {
      if ('index' in schema) {
        return rawArgs[Number(schema['index'])];
      } else {
        return rawArgs;
      }
    });
    delete schematicOptions._;

    workflow.registry.addSmartDefaultProvider('projectName', (_schema: JsonObject) => {
      if (this._workspace) {
        try {
        return this._workspace.getProjectByPath(normalize(process.cwd()))
               || this._workspace.getDefaultProjectName();
        } catch (e) {
          if (e instanceof experimental.workspace.AmbiguousProjectPathException) {
            this.logger.warn(tags.oneLine`
              Two or more projects are using identical roots.
              Unable to determine project using current working directory.
              Using default workspace project instead.
            `);

            return this._workspace.getDefaultProjectName();
          }
          throw e;
        }
      }

      return undefined;
    });

    workflow.reporter.subscribe((event: DryRunEvent) => {
      nothingDone = false;

      // Strip leading slash to prevent confusion.
      const eventPath = event.path.startsWith('/') ? event.path.substr(1) : event.path;

      switch (event.kind) {
        case 'error':
          error = true;
          const desc = event.description == 'alreadyExist' ? 'already exists' : 'does not exist.';
          this.logger.warn(`ERROR! ${eventPath} ${desc}.`);
          break;
        case 'update':
          loggingQueue.push(tags.oneLine`
            ${terminal.white('UPDATE')} ${eventPath} (${event.content.length} bytes)
          `);
          break;
        case 'create':
          loggingQueue.push(tags.oneLine`
            ${terminal.green('CREATE')} ${eventPath} (${event.content.length} bytes)
          `);
          break;
        case 'delete':
          loggingQueue.push(`${terminal.yellow('DELETE')} ${eventPath}`);
          break;
        case 'rename':
          loggingQueue.push(`${terminal.blue('RENAME')} ${eventPath} => ${event.to}`);
          break;
      }
    });

    workflow.lifeCycle.subscribe(event => {
      if (event.kind == 'end' || event.kind == 'post-tasks-start') {
        if (!error) {
          // Output the logging queue, no error happened.
          loggingQueue.forEach(log => this.logger.info(log));
        }

        loggingQueue = [];
        error = false;
      }
    });

    return new Promise<number | void>((resolve) => {
      workflow.execute({
        collection: collectionName,
        schematic: schematicName,
        options: schematicOptions,
        debug: debug,
        logger: this.logger as any,
        allowPrivate: this.allowPrivateSchematics,
      })
      .subscribe({
        error: (err: Error) => {
          // In case the workflow was not successful, show an appropriate error message.
          if (err instanceof UnsuccessfulWorkflowExecution) {
            // "See above" because we already printed the error.
            this.logger.fatal('The Schematic workflow failed. See above.');
          } else if (debug) {
            this.logger.fatal(`An error occured:\n${err.message}\n${err.stack}`);
          } else {
            this.logger.fatal(err.message);
          }

          resolve(1);
        },
        complete: () => {
          const showNothingDone = !(options.showNothingDone === false);
          if (nothingDone && showNothingDone) {
            this.logger.info('Nothing to be done.');
          }
          if (dryRun) {
            this.logger.warn(`\nNOTE: Run with "dry run" no changes were made.`);
          }
          resolve();
        },
      });
    });
  }

  protected removeCoreOptions(options: any): any {
    const opts = Object.assign({}, options);
    if (this._originalOptions.find(option => option.name == 'dryRun')) {
      delete opts.dryRun;
    }
    if (this._originalOptions.find(option => option.name == 'force')) {
      delete opts.force;
    }
    if (this._originalOptions.find(option => option.name == 'debug')) {
      delete opts.debug;
    }

    return opts;
  }

  protected getOptions(options: GetOptionsOptions): Promise<Option[]> {
    // Make a copy.
    this._originalOptions = [...this.options];

    const collectionName = options.collectionName || this.getDefaultSchematicCollection();

    const collection = this.getCollection(collectionName);

    const schematic = this.getSchematic(collection, options.schematicName,
      this.allowPrivateSchematics);
    this._deAliasedName = schematic.description.name;

    if (!schematic.description.schemaJson) {
      return Promise.resolve([]);
    }

    const properties = schematic.description.schemaJson.properties;
    const keys = Object.keys(properties);
    const availableOptions = keys
      .map(key => ({ ...properties[key], ...{ name: strings.dasherize(key) } }))
      .map(opt => {
        const types = ['string', 'boolean', 'integer', 'number'];
        // Ignore arrays / objects.
        if (types.indexOf(opt.type) === -1) {
          return null;
        }

        let aliases: string[] = [];
        if (opt.alias) {
          aliases = [...aliases, opt.alias];
        }
        if (opt.aliases) {
          aliases = [...aliases, ...opt.aliases];
        }
        const schematicDefault = opt.default;

        return {
          ...opt,
          aliases,
          default: undefined, // do not carry over schematics defaults
          schematicDefault,
          hidden: opt.visible === false,
        };
      })
      .filter(x => x);

    return Promise.resolve(availableOptions);
  }

  private _loadWorkspace() {
    if (this._workspace) {
      return;
    }
    const workspaceLoader = new WorkspaceLoader(this._host);

    try {
      workspaceLoader.loadWorkspace(this.project.root).pipe(take(1))
        .subscribe(
          (workspace: experimental.workspace.Workspace) => this._workspace = workspace,
          (err: Error) => {
            if (!this.allowMissingWorkspace) {
              // Ignore missing workspace
              throw err;
            }
          },
        );
    } catch (err) {
      if (!this.allowMissingWorkspace) {
        // Ignore missing workspace
        throw err;
      }
    }
  }

  private _cleanDefaults<T, K extends keyof T>(defaults: T, undefinedOptions: string[]): T {
    (Object.keys(defaults) as K[])
      .filter(key => !undefinedOptions.map(strings.camelize).includes(key as string))
      .forEach(key => {
        delete defaults[key];
      });

    return defaults;
  }

  private readDefaults(collectionName: string, schematicName: string, options: any): {} {
    if (this._deAliasedName) {
      schematicName = this._deAliasedName;
    }

    const projectName = options.project;
    const defaults = getSchematicDefaults(collectionName, schematicName, projectName);

    // Get list of all undefined options.
    const undefinedOptions = this.options
      .filter(o => options[o.name] === undefined)
      .map(o => o.name);

    // Delete any default that is not undefined.
    this._cleanDefaults(defaults, undefinedOptions);

    return defaults;
  }
}
