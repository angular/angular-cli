import { experimental, JsonObject } from '@angular-devkit/core';
import { normalize, strings, tags, terminal, virtualFs } from '@angular-devkit/core';
import { NodeJsSyncHost } from '@angular-devkit/core/node';
import { ArgumentStrategy, Command, Option } from './command';
import { NodeWorkflow } from '@angular-devkit/schematics/tools';
import { DryRunEvent, UnsuccessfulWorkflowExecution } from '@angular-devkit/schematics';
import { getCollection, getSchematic } from '../utilities/schematics';
import { take } from 'rxjs/operators';
import { WorkspaceLoader } from '../models/workspace-loader';
import chalk from 'chalk';

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
}

export interface GetOptionsOptions {
  collectionName: string;
  schematicName: string;
}

export interface GetHelpOutputOptions {
  collectionName: string;
  schematicName: string;
  nonSchematicOptions: any[];
}

const hiddenOptions = [
  'name',
  'path',
  'source-dir',
  'app-root',
  'link-cli',
];

export abstract class SchematicCommand extends Command {
  readonly options: Option[] = [];
  private _host = new NodeJsSyncHost();
  private _workspace: experimental.workspace.Workspace;
  private _deAliasedName: string;
  argStrategy = ArgumentStrategy.Nothing;

  protected readonly coreOptions: Option[] = [
    {
      name: 'dry-run',
      type: Boolean,
      default: false,
      aliases: ['d'],
      description: 'Run through without making any changes.'
    },
    {
      name: 'force',
      type: Boolean,
      default: false,
      aliases: ['f'],
      description: 'Forces overwriting of files.'
    }];

  readonly arguments = ['project'];

  public async initialize(_options: any) {
    this._loadWorkspace();
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

  protected runSchematic(options: RunSchematicOptions) {
    const { collectionName, schematicName, debug, force, dryRun } = options;
    let schematicOptions = this.removeCoreOptions(options.schematicOptions);
    let nothingDone = true;
    const loggingQueue: string[] = [];
    const fsHost = new virtualFs.ScopedHost(new NodeJsSyncHost(), normalize(this.project.root));
    const workflow = new NodeWorkflow(fsHost, { force, dryRun });

    const cwd = process.env.PWD;
    const workingDir = cwd.replace(this.project.root, '').replace(/\\/g, '/');
    const pathOptions = this.setPathOptions(schematicOptions, workingDir);
    schematicOptions = { ...schematicOptions, ...pathOptions };
    const defaultOptions = this.readDefaults(collectionName, schematicName, schematicOptions);
    schematicOptions = { ...schematicOptions, ...defaultOptions };

    // Pass the rest of the arguments as the smart default "argv". Then delete it.
    // Removing the first item which is the schematic name.
    const rawArgs = schematicOptions._;
    workflow.registry.addSmartDefaultProvider('argv', (schema: JsonObject) => {
      if ('index' in schema) {
        return rawArgs[Number(schema['index'])];
      } else {
        return rawArgs;
      }
    });
    delete schematicOptions._;

    workflow.reporter.subscribe((event: DryRunEvent) => {
      nothingDone = false;

      // Strip leading slash to prevent confusion.
      const eventPath = event.path.startsWith('/') ? event.path.substr(1) : event.path;

      switch (event.kind) {
        case 'error':
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

    return new Promise((resolve, reject) => {
      workflow.execute({
        collection: collectionName,
        schematic: schematicName,
        options: schematicOptions,
        debug: debug,
        logger: this.logger,
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

            reject(1);
          },
          complete: () => {
            // Output the logging queue, no error happened.
            loggingQueue.forEach(log => this.logger.info(log));

            if (nothingDone) {
              this.logger.info('Nothing to be done.');
            }
            resolve();
          },
        });
    });
  }

  protected removeCoreOptions(options: any): any {
    const opts = Object.assign({}, options);
    delete opts.dryRun;
    delete opts.force;
    delete opts.debug;
    return opts;
  }

  protected getOptions(options: GetOptionsOptions): Promise<Option[] | null> {
    // TODO: get default collectionName
    const collectionName = options.collectionName || '@schematics/angular';

    const collection = getCollection(collectionName);

    const schematic = getSchematic(collection, options.schematicName);
    this._deAliasedName = schematic.description.name;

    if (!schematic.description.schemaJson) {
      return Promise.resolve(null);
    }

    const properties = schematic.description.schemaJson.properties;
    const keys = Object.keys(properties);
    const availableOptions = keys
      .map(key => ({ ...properties[key], ...{ name: strings.dasherize(key) } }))
      .map(opt => {
        let type;
        const schematicType = opt.type;
        switch (opt.type) {
          case 'string':
            type = String;
            break;
          case 'boolean':
            type = Boolean;
            break;
          case 'integer':
          case 'number':
            type = Number;
            break;

          // Ignore arrays / objects.
          default:
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
          type,
          schematicType,
          default: undefined, // do not carry over schematics defaults
          schematicDefault,
          hidden: opt.visible === false,
        };
      })
      .filter(x => x);

    return Promise.resolve(availableOptions);
  }

  protected getHelpOutput(
    { schematicName, collectionName, nonSchematicOptions }: GetHelpOutputOptions):
    Promise<string[]> {

    const SchematicGetOptionsTask = require('./schematic-get-options').default;
    const getOptionsTask = new SchematicGetOptionsTask({
      ui: this.ui,
      project: this.project
    });
    return Promise.all([getOptionsTask.run({
      schematicName: schematicName,
      collectionName: collectionName,
    }), nonSchematicOptions])
      .then(([availableOptions, nonSchematicOptions]: [Option[], any[]]) => {
        const output: string[] = [];
        [...(nonSchematicOptions || []), ...availableOptions || []]
          .filter(opt => hiddenOptions.indexOf(opt.name) === -1)
          .forEach(opt => {
            let text = chalk.cyan(`    --${opt.name}`);
            if (opt.schematicType) {
              text += chalk.cyan(` (${opt.schematicType})`);
            }
            if (opt.schematicDefault) {
              text += chalk.cyan(` (Default: ${opt.schematicDefault})`);
            }
            if (opt.description) {
              text += ` ${opt.description}`;
            }
            output.push(text);
            if (opt.aliases && opt.aliases.length > 0) {
              const aliasText = opt.aliases.reduce(
                (acc: string, curr: string) => {
                  return acc + ` -${curr}`;
                },
                '');
              output.push(chalk.grey(`      aliases: ${aliasText}`));
            }
          });
        if (availableOptions === null) {
          output.push(chalk.green('This schematic accept additional options, but did not provide '
            + 'documentation.'));
        }

        return output;
      });
  }

  private _loadWorkspace() {
    if (this._workspace) {
      return;
    }
    const workspaceLoader = new WorkspaceLoader(this._host);

    workspaceLoader.loadWorkspace().pipe(take(1))
      .subscribe(workspace => this._workspace = workspace);
  }

  private readDefaults(collectionName: string, schematicName: string, options: any): any {
    let defaults: any = {};

    if (!this._workspace) {
      return {};
    }

    if (this._deAliasedName) {
      schematicName = this._deAliasedName;
    }

    // read and set workspace defaults
    const wsSchematics = this._workspace.getSchematics();
    if (wsSchematics) {
      let key = collectionName;
      if (wsSchematics[key] && typeof wsSchematics[key] === 'object') {
        defaults = {...defaults, ...<object> wsSchematics[key]};
      }
      key = collectionName + ':' + schematicName;
      if (wsSchematics[key] && typeof wsSchematics[key] === 'object') {
        defaults = {...defaults, ...<object> wsSchematics[key]};
      }
    }

    // read and set project defaults
    let projectName = options.project;
    if (!projectName) {
      projectName = this._workspace.listProjectNames()[0];
    }
    if (projectName) {
      const prjSchematics = this._workspace.getProjectSchematics(projectName);
      if (prjSchematics) {
        let key = collectionName;
        if (prjSchematics[key] && typeof prjSchematics[key] === 'object') {
          defaults = {...defaults, ...<object> prjSchematics[key]};
        }
        key = collectionName + ':' + schematicName;
        if (prjSchematics[key] && typeof prjSchematics[key] === 'object') {
          defaults = {...defaults, ...<object> prjSchematics[key]};
        }
      }
    }

    // Get list of all undefined options.
    const undefinedOptions = this.options
      .filter(o => options[o.name] === undefined)
      .map(o => o.name);

    // Delete any default that is not undefined.
    Object.keys(defaults)
      .filter(key => !undefinedOptions.indexOf(key))
      .forEach(key => {
        delete defaults[key];
      });

    return defaults;
  }
}
