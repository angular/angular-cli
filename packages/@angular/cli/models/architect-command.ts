import {
  Architect, BuildEvent, BuilderDescription,
  TargetSpecifier,
} from '@angular-devkit/architect';
import { JsonObject, experimental, schema, strings } from '@angular-devkit/core';
import { NodeJsSyncHost, createConsoleLogger } from '@angular-devkit/core/node';
import { of } from 'rxjs';
import { from } from 'rxjs';
import { concatMap, map, tap, toArray } from 'rxjs/operators';
import { WorkspaceLoader } from '../models/workspace-loader';
import { Command, Option } from './command';


export interface ProjectAndConfigurationOptions {
  project?: string;
  configuration?: string;
  prod: boolean;
}

export interface TargetOptions {
  target?: string;
}

export type ArchitectCommandOptions = ProjectAndConfigurationOptions & TargetOptions & JsonObject;

export abstract class ArchitectCommand extends Command<ArchitectCommandOptions> {

  private _host = new NodeJsSyncHost();
  private _architect: Architect;
  private _workspace: experimental.workspace.Workspace;
  private _logger = createConsoleLogger();
  // If this command supports running multiple targets.
  protected multiTarget = false;

  readonly Options: Option[] = [{
    name: 'configuration',
    description: 'The configuration',
    type: String,
    aliases: ['c'],
  }];

  readonly arguments = ['project'];

  target: string | undefined;

  public async initialize(options: ArchitectCommandOptions): Promise<void> {
    return this._loadWorkspaceAndArchitect().pipe(
      concatMap(() => {
        const targetSpec: TargetSpecifier = this._makeTargetSpecifier(options);

        if (this.target && !targetSpec.project) {
          const projects = this.getProjectNamesByTarget(this.target);

          if (projects.length === 1) {
            // If there is a single target, use it to parse overrides.
            targetSpec.project = projects[0];
          } else {
            // Multiple targets can have different, incompatible options.
            // We only lookup options for single targets.
            return of(null);
          }
        }

        if (!targetSpec.project || !targetSpec.target) {
          throw new Error('Cannot determine project or target for Architect command.');
        }

        const builderConfig = this._architect.getBuilderConfiguration(targetSpec);

        return this._architect.getBuilderDescription(builderConfig).pipe(
          tap<BuilderDescription>(builderDesc => { this.mapArchitectOptions(builderDesc.schema); }),
        );
      }),
    ).toPromise()
      .then(() => { });
  }

  public validate(options: ArchitectCommandOptions) {
    if (!options.project && this.target) {
      const projectNames = this.getProjectNamesByTarget(this.target);
      const { overrides } = this._makeTargetSpecifier(options);
      if (projectNames.length > 1 && Object.keys(overrides).length > 0) {
        throw new Error('Architect commands with multiple targets cannot specify overrides.'
          + `'${this.target}' would be run on the following projects: ${projectNames.join()}`);
      }
    }
    return true;
  }

  protected mapArchitectOptions(schema: any) {
    const properties = schema.properties;
    const keys = Object.keys(properties);
    keys
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
      .filter(x => x)
      .forEach(option => this.options.push(option));
  }

  protected prodOption: Option = {
    name: 'prod',
    description: 'Flag to set configuration to "prod".',
    type: Boolean,
  };

  protected configurationOption: Option = {
    name: 'configuration',
    description: 'Specify the configuration to use.',
    type: String,
    aliases: ['c'],
  };

  protected async runArchitectTarget(options: ArchitectCommandOptions): Promise<number> {
    const targetSpec = this._makeTargetSpecifier(options);

    const runSingleTarget = (targetSpec: TargetSpecifier) => this._architect.run(
      this._architect.getBuilderConfiguration(targetSpec),
      { logger: this._logger },
    ).pipe(
      map((buildEvent: BuildEvent) => buildEvent.success ? 0 : 1),
    );

    try {
      if (!targetSpec.project && this.target) {
        // This runs each target sequentially.
        // Running them in parallel would jumble the log messages.
        return await from(this.getProjectNamesByTarget(this.target)).pipe(
          concatMap(project => runSingleTarget({ ...targetSpec, project })),
          toArray(),
        ).toPromise().then(results => results.every(res => res === 0) ? 0 : 1);
      } else {
        return await runSingleTarget(targetSpec).toPromise();
      }
    } catch (e) {
      if (e instanceof schema.SchemaValidationException) {
        const newErrors: schema.SchemaValidatorError[] = [];
        e.errors.forEach(schemaError => {
          if (schemaError.keyword === 'additionalProperties') {
            const unknownProperty = schemaError.params.additionalProperty;
            if (unknownProperty in options) {
              const dashes = unknownProperty.length === 1 ? '-' : '--';
              this.logger.fatal(`Unknown option: '${dashes}${unknownProperty}'`);

              return 1;
            }
          }
          newErrors.push(schemaError);
        });

        if (newErrors.length > 0) {
          this.logger.error(new schema.SchemaValidationException(newErrors).message);
          return 1;
        }
      } else {
        throw e;
      }
    }
  }

  private getProjectNamesByTarget(targetName: string): string[] {
    const allProjectsForTargetName = this._workspace.listProjectNames().map(projectName =>
      this._architect.listProjectTargets(projectName).includes(targetName) ? projectName : null,
    ).filter(x => !!x);

    if (this.multiTarget) {
      // For multi target commands, we always list all projects that have the target.
      return allProjectsForTargetName;
    } else {
      // For single target commands, we try try the default project project first,
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

  private _loadWorkspaceAndArchitect() {
    const workspaceLoader = new WorkspaceLoader(this._host);

    return workspaceLoader.loadWorkspace(this.project.root).pipe(
      tap((workspace: experimental.workspace.Workspace) => this._workspace = workspace),
      concatMap((workspace: experimental.workspace.Workspace) => {
        return new Architect(workspace).loadArchitect();
      }),
      tap((architect: Architect) => this._architect = architect),
    );
  }

  private _makeTargetSpecifier(options: ArchitectCommandOptions): TargetSpecifier {
    let project, target, configuration, overrides;

    if (options.target) {
      [project, target, configuration] = options.target.split(':');

      overrides = { ...options };
      delete overrides.target;

      if (overrides.configuration) {
        configuration = overrides.configuration;
        delete overrides.configuration;
      }
    } else {
      project = options.project;
      target = this.target;
      configuration = options.configuration;
      if (!configuration && options.prod) {
        configuration = 'production';
      }

      overrides = { ...options };

      delete overrides.configuration;
      delete overrides.prod;
      delete overrides.project;
    }

    return {
      project,
      configuration,
      target,
      overrides,
    };
  }
}
