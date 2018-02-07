/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {
  BaseException,
  JsonObject,
  JsonParseMode,
  Path,
  dirname,
  getSystemPath,
  join,
  logging,
  normalize,
  parseJson,
  resolve,
  schema,
  virtualFs,
} from '@angular-devkit/core';
import { resolve as nodeResolve } from '@angular-devkit/core/node';
import { Observable } from 'rxjs/Observable';
import { of } from 'rxjs/observable/of';
import { _throw } from 'rxjs/observable/throw';
import { concatMap } from 'rxjs/operators';
import {
  BuildEvent,
  Builder,
  BuilderConstructor,
  BuilderContext,
  BuilderDescription,
  BuilderMap,
} from './builder';
import { Workspace } from './workspace';


export class ProjectNotFoundException extends BaseException {
  constructor(name?: string) {
    const nameOrDefault = name ? `Project '${name}'` : `Default project`;
    super(`${nameOrDefault} could not be found in workspace.`);
  }
}

export class TargetNotFoundException extends BaseException {
  constructor(name?: string) {
    const nameOrDefault = name ? `Target '${name}'` : `Default target`;
    super(`${nameOrDefault} could not be found in workspace.`);
  }
}

export class ConfigurationNotFoundException extends BaseException {
  constructor(name: string) {
    super(`Configuration '${name}' could not be found in project.`);
  }
}

export class SchemaValidationException extends BaseException {
  constructor(errors: string[]) {
    super(`Schema validation failed with the following errors:\n  ${errors.join('\n  ')}`);
  }
}

// TODO: break this exception apart into more granular ones.
export class BuilderCannotBeResolvedException extends BaseException {
  constructor(builder: string) {
    super(`Builder '${builder}' cannot be resolved.`);
  }
}

export class WorkspaceNotYetLoadedException extends BaseException {
  constructor() { super(`Workspace needs to be loaded before Architect is used.`); }
}

export interface Target<OptionsT = {}> {
  root: Path;
  projectType: string;
  builder: string;
  options: OptionsT;
}

export interface TargetOptions<OptionsT = {}> {
  project?: string;
  target?: string;
  configuration?: string;
  overrides?: Partial<OptionsT>;
}

export class Architect {
  private readonly _workspaceSchema = join(normalize(__dirname), 'workspace-schema.json');
  private readonly _buildersSchema = join(normalize(__dirname), 'builders-schema.json');
  private _workspace: Workspace;

  constructor(private _root: Path, private _host: virtualFs.Host<{}>) { }

  loadWorkspaceFromHost(workspacePath: Path) {
    return this._host.read(join(this._root, workspacePath)).pipe(
      concatMap((buffer) => {
        const json = JSON.parse(virtualFs.fileBufferToString(buffer));

        return this.loadWorkspaceFromJson(json);
      }),
    );
  }

  loadWorkspaceFromJson(json: Workspace) {
    return this._validateAgainstSchema(json, this._workspaceSchema).pipe(
      concatMap((validatedWorkspace: Workspace) => {
        this._workspace = validatedWorkspace;

        return of(this);
      }),
    );
  }

  getTarget<OptionsT>(options: TargetOptions = {}): Target<OptionsT> {
    let { project, target: targetName } = options;
    const { configuration, overrides } = options;

    if (!this._workspace) {
      throw new WorkspaceNotYetLoadedException();
    }

    project = project || this._workspace.defaultProject as string;
    const workspaceProject = this._workspace.projects[project];

    if (!workspaceProject) {
      throw new ProjectNotFoundException(project);
    }

    targetName = targetName || workspaceProject.defaultTarget as string;
    const workspaceTarget = workspaceProject.targets[targetName];

    if (!workspaceTarget) {
      throw new TargetNotFoundException(targetName);
    }

    const workspaceTargetOptions = workspaceTarget.options;
    let workspaceConfiguration;

    if (configuration) {
      workspaceConfiguration = workspaceTarget.configurations
        && workspaceTarget.configurations[configuration];

      if (!workspaceConfiguration) {
        throw new ConfigurationNotFoundException(configuration);
      }
    }

    // Resolve root for the target.
    // TODO: add Path format to JSON schemas
    const target: Target<OptionsT> = {
      root: resolve(this._root, normalize(workspaceProject.root)),
      projectType: workspaceProject.projectType,
      builder: workspaceTarget.builder,
      options: {
        ...workspaceTargetOptions,
        ...workspaceConfiguration,
        ...overrides as {},
      } as OptionsT,
    };

    return target;
  }

  // Will run the target using the target.
  run<OptionsT>(
    target: Target<OptionsT>,
    partialContext: Partial<BuilderContext> = {},
  ): Observable<BuildEvent> {
    const context: BuilderContext = {
      logger: new logging.NullLogger(),
      architect: this,
      host: this._host,
      ...partialContext,
    };

    let builderDescription: BuilderDescription;

    return this.getBuilderDescription(target).pipe(
      concatMap(description => {
        builderDescription = description;

        return this.validateBuilderOptions(target, builderDescription);
      }),
      concatMap(() => of(this.getBuilder(builderDescription, context))),
      concatMap(builder => builder.run(target)),
    );
  }

  getBuilderDescription<OptionsT>(target: Target<OptionsT>): Observable<BuilderDescription> {
    return new Observable((obs) => {
      // TODO: this probably needs to be more like NodeModulesEngineHost.
      const basedir = getSystemPath(this._root);
      const [pkg, builderName] = target.builder.split(':');
      const pkgJsonPath = nodeResolve(pkg, { basedir, resolvePackageJson: true });
      let buildersJsonPath: Path;

      // Read the `builders` entry of package.json.
      return this._host.read(normalize(pkgJsonPath)).pipe(
        concatMap(buffer =>
          of(parseJson(virtualFs.fileBufferToString(buffer), JsonParseMode.Loose))),
        concatMap((pkgJson: JsonObject) => {
          const pkgJsonBuildersentry = pkgJson['builders'] as string;
          if (!pkgJsonBuildersentry) {
            throw new BuilderCannotBeResolvedException(target.builder);
          }

          buildersJsonPath = join(dirname(normalize(pkgJsonPath)), pkgJsonBuildersentry);

          return this._host.read(buildersJsonPath);
        }),
        concatMap((buffer) => of(JSON.parse(virtualFs.fileBufferToString(buffer)))),
        // Validate builders json.
        concatMap((builderMap) =>
          this._validateAgainstSchema<BuilderMap>(builderMap, this._buildersSchema)),


        concatMap((builderMap) => {
          const builderDescription = builderMap.builders[builderName];

          if (!builderDescription) {
            throw new BuilderCannotBeResolvedException(target.builder);
          }

          // Resolve paths in the builder description.
          const builderJsonDir = dirname(buildersJsonPath);
          builderDescription.schema = join(builderJsonDir, builderDescription.schema);
          builderDescription.class = join(builderJsonDir, builderDescription.class);

          // Validate options again builder schema.
          return of(builderDescription);
        }),
      ).subscribe(obs);
    });
  }

  validateBuilderOptions<OptionsT>(
    target: Target<OptionsT>, builderDescription: BuilderDescription,
  ): Observable<OptionsT> {
    return this._validateAgainstSchema<OptionsT>(target.options,
      normalize(builderDescription.schema));
  }

  getBuilder<OptionsT>(
    builderDescription: BuilderDescription, context: BuilderContext,
  ): Builder<OptionsT> {
    // TODO: support more than the default export, maybe via builder#import-name.
    const builderModule = require(getSystemPath(builderDescription.class));
    const builderClass = builderModule['default'] as BuilderConstructor<OptionsT>;

    return new builderClass(context);
  }

  // Warning: this method changes contentJson in place.
  // TODO: add transforms to resolve paths.
  private _validateAgainstSchema<T = {}>(contentJson: {}, schemaPath: Path): Observable<T> {
    const registry = new schema.CoreSchemaRegistry();

    return this._host.read(schemaPath).pipe(
      concatMap((buffer) => of(JSON.parse(virtualFs.fileBufferToString(buffer)))),
      concatMap((schemaContent) => registry.compile(schemaContent)),
      concatMap(validator => validator(contentJson)),
      concatMap(validatorResult => {
        if (validatorResult.success) {
          return of(contentJson as T);
        } else {
          return _throw(new SchemaValidationException(validatorResult.errors as string[]));
        }
      }),
    );
  }
}
