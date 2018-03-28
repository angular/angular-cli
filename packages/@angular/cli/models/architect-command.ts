import { experimental } from '@angular-devkit/core';
import { NodeJsSyncHost, createConsoleLogger } from '@angular-devkit/core/node';
import { Architect, TargetSpecifier } from '@angular-devkit/architect';
import { Command, Option } from './command';
import { from } from 'rxjs/observable/from';
import { concatMap, map, tap, toArray } from 'rxjs/operators';
import { WorkspaceLoader } from '../models/workspace-loader';
import { of } from 'rxjs/observable/of';
const stringUtils = require('ember-cli-string-utils');


export interface GenericTargetTargetSpecifier {
  target: string;
  configuration?: string;
}

export abstract class ArchitectCommand extends Command {
  private _host = new NodeJsSyncHost();
  private _architect: Architect;
  private _workspace: experimental.workspace.Workspace;
  private _logger = createConsoleLogger();

  readonly Options: Option[] = [{
    name: 'configuration',
    description: 'The configuration',
    type: String,
    aliases: ['c']
  }];

  readonly arguments = ['project'];

  target: string | undefined;

  public async initialize(options: any) {
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
          const projects = this.getAllProjectsForTargetName(this.target);

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
          tap((builderDesc) => this.mapArchitectOptions(builderDesc.schema))
        );
      })
    ).toPromise();
  }

  public validate(options: any) {
    if (!options.project && this.target) {
      const projectNames = this.getAllProjectsForTargetName(this.target);
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

  protected async runArchitectTarget(targetSpec: TargetSpecifier): Promise<number> {
    const runSingleTarget = (targetSpec: TargetSpecifier) => this._architect.run(
      this._architect.getBuilderConfiguration(targetSpec), { logger: this._logger }
    ).pipe(
      map(buildEvent => buildEvent.success ? 0 : 1)
    );

    if (!targetSpec.project && this.target) {
      // This runs each target sequentially. Running them in parallel would jumble the log messages.
      return from(this.getAllProjectsForTargetName(this.target)).pipe(
        concatMap(project => runSingleTarget({ ...targetSpec, project })),
        toArray(),
      ).toPromise().then(results => results.every(res => res === 0) ? 0 : 1);
    } else {
      return runSingleTarget(targetSpec).toPromise();
    }
  }

  private getAllProjectsForTargetName(targetName: string) {
    return this._workspace.listProjectNames().map(projectName =>
      this._architect.listProjectTargets(projectName).includes(targetName) ? projectName : null
    ).filter(x => !!x);
  }

  private _loadWorkspaceAndArchitect() {
    const workspaceLoader = new WorkspaceLoader(this._host);

    return workspaceLoader.loadWorkspace().pipe(
      tap(workspace => this._workspace = workspace),
      concatMap(workspace => new Architect(workspace).loadArchitect()),
      tap(architect => this._architect = architect),
    );
  }
}
