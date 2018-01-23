import { normalize } from '@angular-devkit/core';
import { NodeJsSyncHost } from '@angular-devkit/core/node';
import { Architect, Target } from '@angular-devkit/architect';
import { Command, Option } from './command';
import { run, RunOptions } from '../utilities/architect';
import { concatMap, map } from 'rxjs/operators';
import { createArchitectWorkspace } from '../utilities/build-webpack-compat';
import { CliConfig } from './config';
const stringUtils = require('ember-cli-string-utils');

export abstract class ArchitectCommand extends Command {
  readonly Options: Option[] = [{
    name: 'configuration',
    description: 'The configuration',
    type: String,
    aliases: ['c']
  }];

  readonly arguments = ['project'];

  abstract target: string;

  public async initialize(options: any) {
    const targetOptions = {
      project: options.project || '$$proj0',
      target: this.target,
      configuration: options.configuration,
      // Don't add overrides because they are not in the correct option format yet
      // overrides: convertOverrides
    };

    let architectTarget: Target;
    const host = new NodeJsSyncHost();
    const architect = new Architect(normalize(this.project.root), host);
    const cliConfig = CliConfig.fromProject().config;
    const workspaceConfig = createArchitectWorkspace(cliConfig);
    return architect.loadWorkspaceFromJson(workspaceConfig).pipe(
      concatMap(() => {
        // Get the target without overrides to get the builder description.
        architectTarget = architect.getTarget(targetOptions);

        // Load the description.
        return architect.getBuilderDescription(architectTarget);
      }),
      map(builderDescription => {
        return builderDescription.schema;
      }))
      .toPromise()
      .then((schema) => this.mapArchitectOptions(schema))
      .then(() => { });
  }

  protected mapArchitectOptions(schema: any) {
    const properties = schema.properties;
    const keys = Object.keys(properties);
    keys
      .map(key => ({ ...properties[key], ...{ name: stringUtils.dasherize(key) } }))
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
      .filter(x => x)
      .forEach(option => this.options.push(option));
  }

  protected prodOption: Option = {
    name: 'prod',
    description: 'Flag to set configuration to "prod".',
    type: Boolean
  };

  protected configurationOption: Option = {
    name: 'configuration',
    description: 'Specify the configuration to use.',
    type: String,
    aliases: ['c']
  };

  protected async runArchitect(options: RunArchitectOptions): Promise<number> {
    const runOptions: RunOptions = {
      target: this.target,
      root: this.project.root,
      ...options
    };
    const buildResult = await run(runOptions).toPromise();

    return buildResult.success ? 0 : 1;
  }
}

export interface RunArchitectOptions {
  app: string;
  configuration?: string;
  overrides?: object;
}
