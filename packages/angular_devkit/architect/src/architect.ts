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
import { forkJoin } from 'rxjs/observable/forkJoin';
import { of } from 'rxjs/observable/of';
import { _throw } from 'rxjs/observable/throw';
import { concatMap, map } from 'rxjs/operators';
import {
  BuildEvent,
  Builder,
  BuilderConstructor,
  BuilderContext,
  BuilderDescription,
  BuilderPaths,
  BuilderPathsMap,
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

export class BuilderNotFoundException extends BaseException {
  constructor(builder: string) {
    super(`Builder ${builder} could not be found.`);
  }
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
  private readonly _workspaceSchemaPath = join(normalize(__dirname), 'workspace-schema.json');
  private readonly _buildersSchemaPath = join(normalize(__dirname), 'builders-schema.json');
  private _workspaceSchema: JsonObject;
  private _buildersSchema: JsonObject;
  private _architectSchemasLoaded = false;
  private _builderPathsMap = new Map<string, BuilderPaths>();
  private _builderDescriptionMap = new Map<string, BuilderDescription>();
  private _builderConstructorMap = new Map<string, BuilderConstructor<{}>>();
  private _workspace: Workspace;

  constructor(private _root: Path, private _host: virtualFs.Host<{}>) { }

  loadWorkspaceFromHost(workspacePath: Path) {
    return this._loadArchitectSchemas().pipe(
      concatMap(() => this._loadJsonFile(join(this._root, workspacePath))),
      concatMap(json => this.loadWorkspaceFromJson(json as {} as Workspace)),
    );
  }

  loadWorkspaceFromJson(json: Workspace) {
    return this._loadArchitectSchemas().pipe(
      concatMap(() => this._validateAgainstSchema(json, this._workspaceSchema)),
      concatMap((validatedWorkspace: Workspace) => {
        this._workspace = validatedWorkspace;

        return of(this);
      }),
    );
  }

  private _loadArchitectSchemas() {
    if (this._architectSchemasLoaded) {
      return of(null);
    } else {
      return forkJoin(
        this._loadJsonFile(this._workspaceSchemaPath),
        this._loadJsonFile(this._buildersSchemaPath),
      ).pipe(
        concatMap(([workspaceSchema, buildersSchema]) => {
          this._workspaceSchema = workspaceSchema;
          this._buildersSchema = buildersSchema;

          return of(null);
        }),
      );
    }
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

    // Return a copy of the target object, JSON validation changes objects and we don't
    // want the original properties to be modified.
    return JSON.parse(JSON.stringify(target));
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
      map(() => this.getBuilder(builderDescription, context)),
      concatMap(builder => builder.run(target)),
    );
  }

  getBuilderDescription<OptionsT>(target: Target<OptionsT>): Observable<BuilderDescription> {
    // Check cache for this builder description.
    if (this._builderDescriptionMap.has(target.builder)) {
      return of(this._builderDescriptionMap.get(target.builder) as BuilderDescription);
    }

    return new Observable((obs) => {
      // TODO: this probably needs to be more like NodeModulesEngineHost.
      const basedir = getSystemPath(this._root);
      const [pkg, builderName] = target.builder.split(':');
      const pkgJsonPath = nodeResolve(pkg, { basedir, resolvePackageJson: true });
      let buildersJsonPath: Path;
      let builderPaths: BuilderPaths;

      // Read the `builders` entry of package.json.
      return this._loadJsonFile(normalize(pkgJsonPath)).pipe(
        concatMap((pkgJson: JsonObject) => {
          const pkgJsonBuildersentry = pkgJson['builders'] as string;
          if (!pkgJsonBuildersentry) {
            throw new BuilderCannotBeResolvedException(target.builder);
          }

          buildersJsonPath = join(dirname(normalize(pkgJsonPath)), pkgJsonBuildersentry);

          return this._loadJsonFile(buildersJsonPath);
        }),
        // Validate builders json.
        concatMap((builderPathsMap) =>
          this._validateAgainstSchema<BuilderPathsMap>(builderPathsMap, this._buildersSchema)),
        concatMap((builderPathsMap) => {
          builderPaths = builderPathsMap.builders[builderName];

          if (!builderPaths) {
            throw new BuilderCannotBeResolvedException(target.builder);
          }

          // Resolve paths in the builder paths.
          const builderJsonDir = dirname(buildersJsonPath);
          builderPaths.schema = join(builderJsonDir, builderPaths.schema);
          builderPaths.class = join(builderJsonDir, builderPaths.class);

          // Save the builder paths so that we can lazily load the builder.
          this._builderPathsMap.set(target.builder, builderPaths);

          // Load the schema.
          return this._loadJsonFile(builderPaths.schema);
        }),
        map(builderSchema => {
          const builderDescription = {
            name: target.builder,
            schema: builderSchema,
            description: builderPaths.description,
          };

          // Save to cache before returning.
          this._builderDescriptionMap.set(builderDescription.name, builderDescription);

          return builderDescription;
        }),
      ).subscribe(obs);
    });
  }

  validateBuilderOptions<OptionsT>(
    target: Target<OptionsT>, builderDescription: BuilderDescription,
  ): Observable<OptionsT> {
    return this._validateAgainstSchema<OptionsT>(target.options, builderDescription.schema);
  }

  getBuilder<OptionsT>(
    builderDescription: BuilderDescription, context: BuilderContext,
  ): Builder<OptionsT> {
    const name = builderDescription.name;
    let builderConstructor: BuilderConstructor<OptionsT>;

    // Check cache for this builder.
    if (this._builderConstructorMap.has(name)) {
      builderConstructor = this._builderConstructorMap.get(name) as BuilderConstructor<OptionsT>;
    } else {
      if (!this._builderPathsMap.has(name)) {
        throw new BuilderNotFoundException(name);
      }

      const builderPaths = this._builderPathsMap.get(name) as BuilderPaths;

      // TODO: support more than the default export, maybe via builder#import-name.
      const builderModule = require(getSystemPath(builderPaths.class));
      builderConstructor = builderModule['default'] as BuilderConstructor<OptionsT>;

      // Save builder to cache before returning.
      this._builderConstructorMap.set(builderDescription.name, builderConstructor);
    }

    const builder = new builderConstructor(context);

    return builder;
  }

  // Warning: this method changes contentJson in place.
  // TODO: add transforms to resolve paths.
  private _validateAgainstSchema<T = {}>(contentJson: {}, schemaJson: JsonObject): Observable<T> {
    const registry = new schema.CoreSchemaRegistry();

    return registry.compile(schemaJson).pipe(
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

  private _loadJsonFile(path: Path): Observable<JsonObject> {
    return this._host.read(normalize(path)).pipe(
      map(buffer => virtualFs.fileBufferToString(buffer)),
      map(str => parseJson(str, JsonParseMode.Loose) as {} as JsonObject),
    );
  }
}
