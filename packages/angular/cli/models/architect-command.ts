/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {
  Architect,
  BuildEvent,
  BuilderDescription,
  TargetSpecifier,
} from '@angular-devkit/architect';
import {
  JsonObject,
  UnknownException,
  experimental,
  schema,
  strings,
  tags,
} from '@angular-devkit/core';
import { NodeJsSyncHost, createConsoleLogger } from '@angular-devkit/core/node';
import { from, of } from 'rxjs';
import { concatMap, map, tap, toArray } from 'rxjs/operators';
import { Command, Option } from './command';
import { WorkspaceLoader } from './workspace-loader';

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
    type: 'string',
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
      if (projectNames.length > 1 && Object.keys(overrides || {}).length > 0) {
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

    return true;
  }

  protected mapArchitectOptions(schema: JsonObject) {
    const properties = schema.properties;
    if (typeof properties != 'object' || properties === null || Array.isArray(properties)) {
      throw new UnknownException('Invalid schema.');
    }
    const keys = Object.keys(properties);
    keys
      .map(key => {
        const value = properties[key];
        if (typeof value != 'object') {
          throw new UnknownException('Invalid schema.');
        }

        return {
          ...value,
          name: strings.dasherize(key),
        } as any; // tslint:disable-line:no-any
      })
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
      .filter(x => x)
      .forEach(option => this.addOptions(option));
  }

  protected prodOption: Option = {
    name: 'prod',
    description: 'Flag to set configuration to "prod".',
    type: 'boolean',
  };

  protected configurationOption: Option = {
    name: 'configuration',
    description: 'Specify the configuration to use.',
    type: 'string',
    aliases: ['c'],
  };

  protected async runArchitectTarget(options: ArchitectCommandOptions): Promise<number> {
    delete options._;
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
          map(results => results.every(res => res === 0) ? 0 : 1),
        )
        .toPromise();
      } else {
        return await runSingleTarget(targetSpec).toPromise();
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
      overrides,
    };
  }
}
