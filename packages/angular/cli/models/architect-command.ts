/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {
  Architect,
  BuilderConfiguration,
  TargetSpecifier,
} from '@angular-devkit/architect';
import { experimental, json, schema, tags } from '@angular-devkit/core';
import { NodeJsSyncHost, createConsoleLogger } from '@angular-devkit/core/node';
import { parseJsonSchemaToOptions } from '../utilities/json-schema';
import { BaseCommandOptions, Command } from './command';
import { Arguments } from './interface';
import { parseArguments } from './parser';
import { WorkspaceLoader } from './workspace-loader';

export interface ArchitectCommandOptions extends BaseCommandOptions {
  project?: string;
  configuration?: string;
  prod?: boolean;
  target?: string;
}

export abstract class ArchitectCommand<
  T extends ArchitectCommandOptions = ArchitectCommandOptions,
> extends Command<ArchitectCommandOptions> {
  private _host = new NodeJsSyncHost();
  protected _architect: Architect;
  protected _workspace: experimental.workspace.Workspace;
  protected _logger = createConsoleLogger();

  protected _registry: json.schema.SchemaRegistry;

  // If this command supports running multiple targets.
  protected multiTarget = false;

  target: string | undefined;

  public async initialize(options: ArchitectCommandOptions & Arguments): Promise<void> {
    await super.initialize(options);

    this._registry = new json.schema.CoreSchemaRegistry();
    this._registry.addPostTransform(json.schema.transforms.addUndefinedDefaults);

    await this._loadWorkspaceAndArchitect();

    if (!options.project && this.target) {
      const projectNames = this.getProjectNamesByTarget(this.target);
      const leftovers = options['--'];
      if (projectNames.length > 1 && leftovers && leftovers.length > 0) {
        // Verify that all builders are the same, otherwise error out (since the meaning of an
        // option could vary from builder to builder).

        const builders: string[] = [];
        for (const projectName of projectNames) {
          const targetSpec: TargetSpecifier = this._makeTargetSpecifier(options);
          const targetDesc = this._architect.getBuilderConfiguration({
            project: projectName,
            target: targetSpec.target,
          });

          if (builders.indexOf(targetDesc.builder) == -1) {
            builders.push(targetDesc.builder);
          }
        }

        if (builders.length > 1) {
          throw new Error(tags.oneLine`
            Architect commands with command line overrides cannot target different builders. The
            '${this.target}' target would run on projects ${projectNames.join()} which have the
            following builders: ${'\n  ' + builders.join('\n  ')}
          `);
        }
      }
    }

    const targetSpec: TargetSpecifier = this._makeTargetSpecifier(options);

    if (this.target && !targetSpec.project) {
      const projects = this.getProjectNamesByTarget(this.target);

      if (projects.length === 1) {
        // If there is a single target, use it to parse overrides.
        targetSpec.project = projects[0];
      }
    }

    if ((!targetSpec.project || !targetSpec.target) && !this.multiTarget) {
      if (options.help) {
        // This is a special case where we just return.
        return;
      }

      throw new Error('Cannot determine project or target for Architect command.');
    }

    if (this.target) {
      // Add options IF there's only one builder of this kind.
      const targetSpec: TargetSpecifier = this._makeTargetSpecifier(options);
      const projectNames = targetSpec.project
        ? [targetSpec.project]
        : this.getProjectNamesByTarget(this.target);

      const builderConfigurations: BuilderConfiguration[] = [];
      for (const projectName of projectNames) {
        const targetDesc = this._architect.getBuilderConfiguration({
          project: projectName,
          target: targetSpec.target,
        });

        if (!builderConfigurations.find(b => b.builder === targetDesc.builder)) {
          builderConfigurations.push(targetDesc);
        }
      }

      if (builderConfigurations.length == 1) {
        const builderConf = builderConfigurations[0];
        const builderDesc = await this._architect.getBuilderDescription(builderConf).toPromise();

        this.description.options.push(...(
          await parseJsonSchemaToOptions(this._registry, builderDesc.schema)
        ));
      }
    }
  }

  async run(options: ArchitectCommandOptions & Arguments) {
    return await this.runArchitectTarget(options);
  }

  protected async runSingleTarget(targetSpec: TargetSpecifier, options: string[]) {
    // We need to build the builderSpec twice because architect does not understand
    // overrides separately (getting the configuration builds the whole project, including
    // overrides).
    const builderConf = this._architect.getBuilderConfiguration(targetSpec);
    const builderDesc = await this._architect.getBuilderDescription(builderConf).toPromise();
    const targetOptionArray = await parseJsonSchemaToOptions(this._registry, builderDesc.schema);
    const overrides = parseArguments(options, targetOptionArray);

    if (overrides['--']) {
      (overrides['--'] || []).forEach(additional => {
        this.logger.fatal(`Unknown option: '${additional.split(/=/)[0]}'`);
      });

      return 1;
    }
    const realBuilderConf = this._architect.getBuilderConfiguration({ ...targetSpec, overrides });

    const result = await this._architect.run(realBuilderConf, { logger: this._logger }).toPromise();

    return result.success ? 0 : 1;
  }

  protected async runArchitectTarget(
    options: ArchitectCommandOptions & Arguments,
  ): Promise<number> {
    const extra = options['--'] || [];

    try {
      const targetSpec = this._makeTargetSpecifier(options);
      if (!targetSpec.project && this.target) {
        // This runs each target sequentially.
        // Running them in parallel would jumble the log messages.
        let result = 0;
        for (const project of this.getProjectNamesByTarget(this.target)) {
          result |= await this.runSingleTarget({ ...targetSpec, project }, extra);
        }

        return result;
      } else {
        return await this.runSingleTarget(targetSpec, extra);
      }
    } catch (e) {
      if (e instanceof schema.SchemaValidationException) {
        const newErrors: schema.SchemaValidatorError[] = [];
        for (const schemaError of e.errors) {
          if (schemaError.keyword === 'additionalProperties') {
            const unknownProperty = schemaError.params.additionalProperty;
            if (unknownProperty in options) {
              const dashes = unknownProperty.length === 1 ? '-' : '--';
              this.logger.fatal(`Unknown option: '${dashes}${unknownProperty}'`);
              continue;
            }
          }
          newErrors.push(schemaError);
        }

        if (newErrors.length > 0) {
          this.logger.error(new schema.SchemaValidationException(newErrors).message);
        }

        return 1;
      } else {
        throw e;
      }
    }
  }

  private getProjectNamesByTarget(targetName: string): string[] {
    const allProjectsForTargetName = this._workspace.listProjectNames().map(projectName =>
      this._architect.listProjectTargets(projectName).includes(targetName) ? projectName : null,
    ).filter(x => !!x) as string[];

    if (this.multiTarget) {
      // For multi target commands, we always list all projects that have the target.
      return allProjectsForTargetName;
    } else {
      // For single target commands, we try the default project first,
      // then the full list if it has a single project, then error out.
      const maybeDefaultProject = this._workspace.getDefaultProjectName();
      if (maybeDefaultProject && allProjectsForTargetName.includes(maybeDefaultProject)) {
        return [maybeDefaultProject];
      }

      if (allProjectsForTargetName.length === 1) {
        return allProjectsForTargetName;
      }

      throw new Error(`Could not determine a single project for the '${targetName}' target.`);
    }
  }

  private async _loadWorkspaceAndArchitect() {
    const workspaceLoader = new WorkspaceLoader(this._host);

    const workspace = await workspaceLoader.loadWorkspace(this.workspace.root);

    this._workspace = workspace;
    this._architect = await new Architect(workspace).loadArchitect().toPromise();
  }

  private _makeTargetSpecifier(commandOptions: ArchitectCommandOptions): TargetSpecifier {
    let project, target, configuration;

    if (commandOptions.target) {
      [project, target, configuration] = commandOptions.target.split(':');

      if (commandOptions.configuration) {
        configuration = commandOptions.configuration;
      }
    } else {
      project = commandOptions.project;
      target = this.target;
      configuration = commandOptions.configuration;
      if (!configuration && commandOptions.prod) {
        configuration = 'production';
      }
    }

    if (!project) {
      project = '';
    }
    if (!target) {
      target = '';
    }

    return {
      project,
      configuration,
      target,
    };
  }
}
