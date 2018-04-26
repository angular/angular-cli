import { experimental, schema, strings } from '@angular-devkit/core';
import { NodeJsSyncHost, createConsoleLogger } from '@angular-devkit/core/node';
import {
  Architect, BuilderDescription, BuildEvent,
  TargetSpecifier
} from '@angular-devkit/architect';
import { Command, Option } from './command';
import { of } from 'rxjs';
import { from } from 'rxjs';
import { concatMap, map, tap, toArray } from 'rxjs/operators';
import { WorkspaceLoader } from '../models/workspace-loader';


export abstract class ArchitectCommand<T = any> extends Command<T> {
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
    aliases: ['c']
  }];

  readonly arguments = ['project'];

  target: string | undefined;

  public async initialize(options: any): Promise<void> {
    return this._loadWorkspaceAndArchitect().pipe(
      concatMap(() => {
        let targetSpec: TargetSpecifier;
        if (options.project) {
          targetSpec = {
            project: options.project,
            target: this.target
          };
        } else if (options.target) {
          const [project, target] = options.target.split(':');
          targetSpec = { project, target };
        } else if (this.target) {
          const projects = this.getProjectNamesByTarget(this.target);

          if (projects.length === 1) {
            // If there is a single target, use it to parse overrides.
            targetSpec = {
              project: projects[0],
              target: this.target
            };
          } else {
            // Multiple targets can have different, incompatible options.
            // We only lookup options for single targets.
            return of(null);
          }
        } else {
          throw new Error('Cannot determine project or target for Architect command.');
        }

        const builderConfig = this._architect.getBuilderConfiguration(targetSpec);

        return this._architect.getBuilderDescription(builderConfig).pipe(
          tap<BuilderDescription>(builderDesc => { this.mapArchitectOptions(builderDesc.schema); })
        );
      })
    ).toPromise()
      .then(() => { });
  }

  public validate(options: any) {
    if (!options.project && this.target) {
      const projectNames = this.getProjectNamesByTarget(this.target);
      const overrides = { ...options };
      delete overrides.project;
      delete overrides.configuration;
      delete overrides.prod;
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
    type: Boolean
  };

  protected configurationOption: Option = {
    name: 'configuration',
    description: 'Specify the configuration to use.',
    type: String,
    aliases: ['c']
  };

  protected async runArchitectTarget(
    targetSpec: TargetSpecifier,
    commandOptions: T,
  ): Promise<number> {
    const runSingleTarget = (targetSpec: TargetSpecifier) => this._architect.run(
      this._architect.getBuilderConfiguration(targetSpec),
      { logger: this._logger }
    ).pipe(
      map((buildEvent: BuildEvent) => buildEvent.success ? 0 : 1)
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
            if (unknownProperty in commandOptions) {
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
      this._architect.listProjectTargets(projectName).includes(targetName) ? projectName : null
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

      throw new Error(`Could not determine a single project for the '${targetName} target.`);
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
}
