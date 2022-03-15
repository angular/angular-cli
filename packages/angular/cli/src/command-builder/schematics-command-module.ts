/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { schema, tags } from '@angular-devkit/core';
import { Collection, UnsuccessfulWorkflowExecution, formats } from '@angular-devkit/schematics';
import {
  FileSystemCollectionDescription,
  FileSystemSchematicDescription,
  NodeWorkflow,
} from '@angular-devkit/schematics/tools';
import inquirer from 'inquirer';
import { Argv } from 'yargs';
import {
  getProjectByCwd,
  getProjectsByPath,
  getSchematicDefaults,
  getWorkspace,
} from '../utilities/config';
import { isTTY } from '../utilities/tty';
import {
  CommandModule,
  CommandModuleImplementation,
  CommandScope,
  Options,
  OtherOptions,
} from './command-module';
import { Option, parseJsonSchemaToOptions } from './utilities/json-schema';
import { SchematicEngineHost } from './utilities/schematic-engine-host';
import { subscribeToWorkflow } from './utilities/schematic-workflow';

const DEFAULT_SCHEMATICS_COLLECTION = '@schematics/angular';

export interface SchematicsCommandArgs {
  interactive: boolean;
  force: boolean;
  'dry-run': boolean;
  defaults: boolean;
}

export interface SchematicsExecutionOptions extends Options<SchematicsCommandArgs> {
  packageRegistry?: string;
}

export abstract class SchematicsCommandModule
  extends CommandModule<SchematicsCommandArgs>
  implements CommandModuleImplementation<SchematicsCommandArgs>
{
  static override scope = CommandScope.In;
  protected readonly allowPrivateSchematics: boolean = false;
  protected override readonly shouldReportAnalytics = false;

  async builder(argv: Argv): Promise<Argv<SchematicsCommandArgs>> {
    return argv
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

  private _workflowForBuilder: NodeWorkflow | undefined;
  protected getOrCreateWorkflowForBuilder(collectionName: string): NodeWorkflow {
    if (this._workflowForBuilder) {
      return this._workflowForBuilder;
    }

    return (this._workflowForBuilder = new NodeWorkflow(this.context.root, {
      resolvePaths: this.getResolvePaths(collectionName),
      engineHostCreator: (options) => new SchematicEngineHost(options.resolvePaths),
    }));
  }

  private _workflowForExecution: NodeWorkflow | undefined;
  protected async getOrCreateWorkflowForExecution(
    collectionName: string,
    options: SchematicsExecutionOptions,
  ): Promise<NodeWorkflow> {
    if (this._workflowForExecution) {
      return this._workflowForExecution;
    }

    const { logger, root, packageManager } = this.context;
    const { force, dryRun, packageRegistry } = options;

    const workflow = new NodeWorkflow(root, {
      force,
      dryRun,
      packageManager,
      // A schema registry is required to allow customizing addUndefinedDefaults
      registry: new schema.CoreSchemaRegistry(formats.standardFormats),
      packageRegistry,
      resolvePaths: this.getResolvePaths(collectionName),
      schemaValidation: true,
      optionTransforms: [
        // Add configuration file defaults
        async (schematic, current) => {
          const projectName =
            typeof (current as Record<string, unknown>).project === 'string'
              ? ((current as Record<string, unknown>).project as string)
              : this.getProjectName();

          return {
            ...(await getSchematicDefaults(schematic.collection.name, schematic.name, projectName)),
            ...current,
          };
        },
      ],
      engineHostCreator: (options) => new SchematicEngineHost(options.resolvePaths),
    });

    workflow.registry.addPostTransform(schema.transforms.addUndefinedDefaults);
    workflow.registry.addSmartDefaultProvider('projectName', () => this.getProjectName());
    workflow.registry.useXDeprecatedProvider((msg) => logger.warn(msg));

    let shouldReportAnalytics = true;
    workflow.engineHost.registerOptionsTransform(async (schematic, options) => {
      if (shouldReportAnalytics) {
        shouldReportAnalytics = false;
        // ng generate lib -> ng generate
        const commandName = this.command?.split(' ', 1)[0];

        await this.reportAnalytics(options as {}, [
          commandName,
          schematic.collection.name.replace(/\//g, '_'),
          schematic.name.replace(/\//g, '_'),
        ]);
      }

      return options;
    });

    if (options.interactive !== false && isTTY()) {
      workflow.registry.usePromptProvider((definitions: Array<schema.PromptDefinition>) => {
        const questions: inquirer.QuestionCollection = definitions
          .filter((definition) => !options.defaults || definition.default === undefined)
          .map((definition) => {
            const question: inquirer.Question = {
              name: definition.id,
              message: definition.message,
              default: definition.default,
            };

            const validator = definition.validator;
            if (validator) {
              question.validate = (input) => validator(input);

              // Filter allows transformation of the value prior to validation
              question.filter = async (input) => {
                for (const type of definition.propertyTypes) {
                  let value;
                  switch (type) {
                    case 'string':
                      value = String(input);
                      break;
                    case 'integer':
                    case 'number':
                      value = Number(input);
                      break;
                    default:
                      value = input;
                      break;
                  }
                  // Can be a string if validation fails
                  const isValid = (await validator(value)) === true;
                  if (isValid) {
                    return value;
                  }
                }

                return input;
              };
            }

            switch (definition.type) {
              case 'confirmation':
                question.type = 'confirm';
                break;
              case 'list':
                question.type = definition.multiselect ? 'checkbox' : 'list';
                (question as inquirer.CheckboxQuestion).choices = definition.items?.map((item) => {
                  return typeof item == 'string'
                    ? item
                    : {
                        name: item.label,
                        value: item.value,
                      };
                });
                break;
              default:
                question.type = definition.type;
                break;
            }

            return question;
          });

        return inquirer.prompt(questions);
      });
    }

    return (this._workflowForExecution = workflow);
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

  protected async runSchematic(options: {
    executionOptions: SchematicsExecutionOptions;
    schematicOptions: OtherOptions;
    collectionName: string;
    schematicName: string;
  }): Promise<number> {
    const { logger } = this.context;
    const { schematicOptions, executionOptions, collectionName, schematicName } = options;
    const workflow = await this.getOrCreateWorkflowForExecution(collectionName, executionOptions);

    if (!schematicName) {
      throw new Error('schematicName cannot be undefined.');
    }

    const { unsubscribe, files } = subscribeToWorkflow(workflow, logger);

    try {
      await workflow
        .execute({
          collection: collectionName,
          schematic: schematicName,
          options: schematicOptions,
          logger,
          allowPrivate: this.allowPrivateSchematics,
        })
        .toPromise();

      if (!files.size) {
        logger.info('Nothing to be done.');
      }

      if (executionOptions.dryRun) {
        logger.warn(`\nNOTE: The "--dry-run" option means no changes were made.`);
      }
    } catch (err) {
      // In case the workflow was not successful, show an appropriate error message.
      if (err instanceof UnsuccessfulWorkflowExecution) {
        // "See above" because we already printed the error.
        logger.fatal('The Schematic workflow failed. See above.');

        return 1;
      } else {
        throw err;
      }
    } finally {
      unsubscribe();
    }

    return 0;
  }

  private getProjectName(): string | undefined {
    const { workspace, logger } = this.context;
    if (!workspace) {
      return undefined;
    }

    const projectNames = getProjectsByPath(workspace, process.cwd(), workspace.basePath);

    if (projectNames.length === 1) {
      return projectNames[0];
    } else {
      if (projectNames.length > 1) {
        logger.warn(tags.oneLine`
            Two or more projects are using identical roots.
            Unable to determine project using current working directory.
            Using default workspace project instead.
          `);
      }

      const defaultProjectName = workspace.extensions['defaultProject'];
      if (typeof defaultProjectName === 'string' && defaultProjectName) {
        return defaultProjectName;
      }
    }

    return undefined;
  }

  private getResolvePaths(collectionName: string): string[] {
    const { workspace, root } = this.context;

    return workspace
      ? // Workspace
        collectionName === DEFAULT_SCHEMATICS_COLLECTION
        ? // Favor __dirname for @schematics/angular to use the build-in version
          [__dirname, process.cwd(), root]
        : [process.cwd(), root, __dirname]
      : // Global
        [__dirname, process.cwd()];
  }
}
