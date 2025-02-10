/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { JsonValue, normalize as devkitNormalize, schema } from '@angular-devkit/core';
import { Collection, UnsuccessfulWorkflowExecution, formats } from '@angular-devkit/schematics';
import {
  FileSystemCollectionDescription,
  FileSystemSchematicDescription,
  NodeWorkflow,
} from '@angular-devkit/schematics/tools';
import { relative } from 'path';
import { Argv } from 'yargs';
import { isPackageNameSafeForAnalytics } from '../analytics/analytics';
import { EventCustomDimension } from '../analytics/analytics-parameters';
import { getProjectByCwd, getSchematicDefaults } from '../utilities/config';
import { assertIsError } from '../utilities/error';
import { memoize } from '../utilities/memoize';
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

export const DEFAULT_SCHEMATICS_COLLECTION = '@schematics/angular';

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
  override scope = CommandScope.In;
  protected readonly allowPrivateSchematics: boolean = false;

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
        alias: ['d'],
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

  @memoize
  protected getOrCreateWorkflowForBuilder(collectionName: string): NodeWorkflow {
    return new NodeWorkflow(this.context.root, {
      resolvePaths: this.getResolvePaths(collectionName),
      engineHostCreator: (options) => new SchematicEngineHost(options.resolvePaths),
    });
  }

  @memoize
  protected async getOrCreateWorkflowForExecution(
    collectionName: string,
    options: SchematicsExecutionOptions,
  ): Promise<NodeWorkflow> {
    const { logger, root, packageManager } = this.context;
    const { force, dryRun, packageRegistry } = options;

    const workflow = new NodeWorkflow(root, {
      force,
      dryRun,
      packageManager: packageManager.name,
      // A schema registry is required to allow customizing addUndefinedDefaults
      registry: new schema.CoreSchemaRegistry(formats.standardFormats),
      packageRegistry,
      resolvePaths: this.getResolvePaths(collectionName),
      schemaValidation: true,
      optionTransforms: [
        // Add configuration file defaults
        async (schematic, current) => {
          const projectName =
            typeof current?.project === 'string' ? current.project : this.getProjectName();

          return {
            ...(await getSchematicDefaults(schematic.collection.name, schematic.name, projectName)),
            ...current,
          };
        },
      ],
      engineHostCreator: (options) => new SchematicEngineHost(options.resolvePaths),
    });

    workflow.registry.addPostTransform(schema.transforms.addUndefinedDefaults);
    workflow.registry.useXDeprecatedProvider((msg) => logger.warn(msg));
    workflow.registry.addSmartDefaultProvider('projectName', () => this.getProjectName());

    const workingDir = devkitNormalize(relative(this.context.root, process.cwd()));
    workflow.registry.addSmartDefaultProvider('workingDirectory', () =>
      workingDir === '' ? undefined : workingDir,
    );

    let shouldReportAnalytics = true;
    workflow.engineHost.registerOptionsTransform(async (schematic, options) => {
      // Report analytics
      if (shouldReportAnalytics) {
        shouldReportAnalytics = false;

        const {
          collection: { name: collectionName },
          name: schematicName,
        } = schematic;

        const analytics = isPackageNameSafeForAnalytics(collectionName)
          ? await this.getAnalytics()
          : undefined;

        analytics?.reportSchematicRunEvent({
          [EventCustomDimension.SchematicCollectionName]: collectionName,
          [EventCustomDimension.SchematicName]: schematicName,
          ...this.getAnalyticsParameters(options as unknown as {}),
        });
      }

      return options;
    });

    if (options.interactive !== false && isTTY()) {
      workflow.registry.usePromptProvider(async (definitions: Array<schema.PromptDefinition>) => {
        let prompts: typeof import('@inquirer/prompts') | undefined;
        const answers: Record<string, JsonValue> = {};

        for (const definition of definitions) {
          if (options.defaults && definition.default !== undefined) {
            continue;
          }

          // Only load prompt package if needed
          prompts ??= await import('@inquirer/prompts');

          switch (definition.type) {
            case 'confirmation':
              answers[definition.id] = await prompts.confirm({
                message: definition.message,
                default: definition.default as boolean | undefined,
              });
              break;
            case 'list':
              if (!definition.items?.length) {
                continue;
              }

              answers[definition.id] = await (
                definition.multiselect ? prompts.checkbox : prompts.select
              )({
                message: definition.message,
                validate: (values) => {
                  if (!definition.validator) {
                    return true;
                  }

                  return definition.validator(Object.values(values).map(({ value }) => value));
                },
                default: definition.multiselect ? undefined : definition.default,
                choices: definition.items?.map((item) =>
                  typeof item == 'string'
                    ? {
                        name: item,
                        value: item,
                      }
                    : {
                        ...item,
                        name: item.label,
                        value: item.value,
                      },
                ),
              });
              break;
            case 'input': {
              let finalValue: JsonValue | undefined;
              answers[definition.id] = await prompts.input({
                message: definition.message,
                default: definition.default as string | undefined,
                async validate(value) {
                  if (definition.validator === undefined) {
                    return true;
                  }

                  let lastValidation: ReturnType<typeof definition.validator> = false;
                  for (const type of definition.propertyTypes) {
                    let potential;
                    switch (type) {
                      case 'string':
                        potential = String(value);
                        break;
                      case 'integer':
                      case 'number':
                        potential = Number(value);
                        break;
                      default:
                        potential = value;
                        break;
                    }
                    lastValidation = await definition.validator(potential);

                    // Can be a string if validation fails
                    if (lastValidation === true) {
                      finalValue = potential;

                      return true;
                    }
                  }

                  return lastValidation;
                },
              });

              // Use validated value if present.
              // This ensures the correct type is inserted into the final schema options.
              if (finalValue !== undefined) {
                answers[definition.id] = finalValue;
              }
              break;
            }
          }
        }

        return answers;
      });
    }

    return workflow;
  }

  @memoize
  protected async getSchematicCollections(): Promise<Set<string>> {
    const getSchematicCollections = (
      configSection: Record<string, unknown> | undefined,
    ): Set<string> | undefined => {
      if (!configSection) {
        return undefined;
      }

      const { schematicCollections } = configSection;
      if (Array.isArray(schematicCollections)) {
        return new Set(schematicCollections);
      }

      return undefined;
    };

    const { workspace, globalConfiguration } = this.context;
    if (workspace) {
      const project = getProjectByCwd(workspace);
      if (project) {
        const value = getSchematicCollections(workspace.getProjectCli(project));
        if (value) {
          return value;
        }
      }
    }

    const value =
      getSchematicCollections(workspace?.getCli()) ??
      getSchematicCollections(globalConfiguration.getCli());
    if (value) {
      return value;
    }

    return new Set([DEFAULT_SCHEMATICS_COLLECTION]);
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
      } else {
        assertIsError(err);
        logger.fatal(err.message);
      }

      return 1;
    } finally {
      unsubscribe();
    }

    return 0;
  }

  private getProjectName(): string | undefined {
    const { workspace } = this.context;
    if (!workspace) {
      return undefined;
    }

    const projectName = getProjectByCwd(workspace);
    if (projectName) {
      return projectName;
    }

    return undefined;
  }

  private getResolvePaths(collectionName: string): string[] {
    const { workspace, root } = this.context;
    if (collectionName[0] === '.') {
      // Resolve relative collections from the location of `angular.json`
      return [root];
    }

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
