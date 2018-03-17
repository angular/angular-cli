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
  experimental,
  getSystemPath,
  join,
  logging,
  normalize,
  parseJson,
  resolve,
  virtualFs,
} from '@angular-devkit/core';
import { resolve as nodeResolve } from '@angular-devkit/core/node';
import { Observable } from 'rxjs/Observable';
import { forkJoin } from 'rxjs/observable/forkJoin';
import { of } from 'rxjs/observable/of';
import { _throw } from 'rxjs/observable/throw';
import { concatMap, map, tap } from 'rxjs/operators';
import {
  BuildEvent,
  Builder,
  BuilderConstructor,
  BuilderContext,
  BuilderDescription,
  BuilderPaths,
  BuilderPathsMap,
} from './builder';

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

// TODO: break this exception apart into more granular ones.
export class BuilderCannotBeResolvedException extends BaseException {
  constructor(builder: string) {
    super(`Builder '${builder}' cannot be resolved.`);
  }
}

export class ArchitectNotYetLoadedException extends BaseException {
  constructor() { super(`Architect needs to be loaded before Architect is used.`); }
}

export class BuilderNotFoundException extends BaseException {
  constructor(builder: string) {
    super(`Builder ${builder} could not be found.`);
  }
}

export interface BuilderConfiguration<OptionsT = {}> {
  root: Path;
  projectType: string;
  builder: string;
  options: OptionsT;
}

export interface TargetSpecifier<OptionsT = {}> {
  project: string;
  target: string;
  configuration?: string;
  overrides?: Partial<OptionsT>;
}

export interface TargetsMap {
  [k: string]: Target;
}

export declare type TargetOptions<T = JsonObject> = T;
export declare type TargetConfiguration<T = JsonObject> = Partial<T>;

export interface Target<T = JsonObject> {
  builder: string;
  options: TargetOptions<T>;
  configurations?: { [k: string]: TargetConfiguration<T> };
}

export class Architect {
  private readonly _targetsSchemaPath = join(normalize(__dirname), 'targets-schema.json');
  private readonly _buildersSchemaPath = join(normalize(__dirname), 'builders-schema.json');
  private _targetsSchema: JsonObject;
  private _buildersSchema: JsonObject;
  private _architectSchemasLoaded = false;
  private _builderPathsMap = new Map<string, BuilderPaths>();
  private _builderDescriptionMap = new Map<string, BuilderDescription>();
  private _builderConstructorMap = new Map<string, BuilderConstructor<{}>>();

  constructor(private _workspace: experimental.workspace.Workspace) { }

  loadArchitect() {
    if (this._architectSchemasLoaded) {
      return of(this);
    } else {
      return forkJoin(
        this._loadJsonFile(this._targetsSchemaPath),
        this._loadJsonFile(this._buildersSchemaPath),
      ).pipe(
        concatMap(([workspaceSchema, buildersSchema]) => {
          this._targetsSchema = workspaceSchema;
          this._buildersSchema = buildersSchema;
          this._architectSchemasLoaded = true;

          return of(this);
        }),
      );
    }
  }

  getBuilderConfiguration<OptionsT>(
    targetSpec: TargetSpecifier,
  ): Observable<BuilderConfiguration<OptionsT>> {
    const {
      project: projectName,
      target: targetName,
      configuration: configurationName,
      overrides,
    } = targetSpec;

    const project = this._workspace.getProject(projectName);
    const targets = this._workspace.getProjectArchitect(projectName);
    let configuration: TargetConfiguration = {};
    let target: Target, options: TargetOptions;

    return this._workspace.validateAgainstSchema<TargetsMap>(targets, this._targetsSchema).pipe(
      concatMap((validatedWorkspaceTargets) => {
        target = validatedWorkspaceTargets[targetName];

        if (!target) {
          return _throw(new TargetNotFoundException(targetName));
        }

        options = target.options;

        if (configurationName) {
          if (!target.configurations) {
            return _throw(new ConfigurationNotFoundException(configurationName));
          }

          configuration = target.configurations[configurationName];

          if (!configuration) {
            return _throw(new ConfigurationNotFoundException(configurationName));
          }
        }

        const builderConfiguration: BuilderConfiguration<OptionsT> = {
          root: resolve(this._workspace.root, normalize(project.root)),
          projectType: project.projectType,
          builder: target.builder,
          options: {
            ...options,
            ...configuration,
            ...overrides as {},
          } as OptionsT,
        };

        return of(builderConfiguration);
      }),
    );
  }

  run<OptionsT>(
    builderConfig: BuilderConfiguration<OptionsT>,
    partialContext: Partial<BuilderContext> = {},
  ): Observable<BuildEvent> {
    const context: BuilderContext = {
      logger: new logging.NullLogger(),
      architect: this,
      host: this._workspace.host,
      ...partialContext,
    };

    let builderDescription: BuilderDescription;

    return this.getBuilderDescription(builderConfig).pipe(
      tap(description => builderDescription = description),
      concatMap(() => this.validateBuilderOptions(builderConfig, builderDescription)),
      tap(validatedBuilderConfig => builderConfig = validatedBuilderConfig),
      map(() => this.getBuilder(builderDescription, context)),
      concatMap(builder => builder.run(builderConfig)),
    );
  }

  getBuilderDescription<OptionsT>(
    builderConfig: BuilderConfiguration<OptionsT>,
  ): Observable<BuilderDescription> {
    // Check cache for this builder description.
    if (this._builderDescriptionMap.has(builderConfig.builder)) {
      return of(this._builderDescriptionMap.get(builderConfig.builder) as BuilderDescription);
    }

    return new Observable((obs) => {
      // TODO: this probably needs to be more like NodeModulesEngineHost.
      const basedir = getSystemPath(this._workspace.root);
      const [pkg, builderName] = builderConfig.builder.split(':');
      const pkgJsonPath = nodeResolve(pkg, { basedir, resolvePackageJson: true });
      let buildersJsonPath: Path;
      let builderPaths: BuilderPaths;

      // Read the `builders` entry of package.json.
      return this._loadJsonFile(normalize(pkgJsonPath)).pipe(
        concatMap((pkgJson: JsonObject) => {
          const pkgJsonBuildersentry = pkgJson['builders'] as string;
          if (!pkgJsonBuildersentry) {
            return _throw(new BuilderCannotBeResolvedException(builderConfig.builder));
          }

          buildersJsonPath = join(dirname(normalize(pkgJsonPath)), pkgJsonBuildersentry);

          return this._loadJsonFile(buildersJsonPath);
        }),
        // Validate builders json.
        concatMap((builderPathsMap) => this._workspace.validateAgainstSchema<BuilderPathsMap>(
          builderPathsMap, this._buildersSchema)),
        concatMap((builderPathsMap) => {
          builderPaths = builderPathsMap.builders[builderName];

          if (!builderPaths) {
            return _throw(new BuilderCannotBeResolvedException(builderConfig.builder));
          }

          // Resolve paths in the builder paths.
          const builderJsonDir = dirname(buildersJsonPath);
          builderPaths.schema = join(builderJsonDir, builderPaths.schema);
          builderPaths.class = join(builderJsonDir, builderPaths.class);

          // Save the builder paths so that we can lazily load the builder.
          this._builderPathsMap.set(builderConfig.builder, builderPaths);

          // Load the schema.
          return this._loadJsonFile(builderPaths.schema);
        }),
        map(builderSchema => {
          const builderDescription = {
            name: builderConfig.builder,
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
    builderConfig: BuilderConfiguration<OptionsT>, builderDescription: BuilderDescription,
  ): Observable<BuilderConfiguration<OptionsT>> {
    return this._workspace.validateAgainstSchema<OptionsT>(
      builderConfig.options, builderDescription.schema,
    ).pipe(
      map(validatedOptions => {
        builderConfig.options = validatedOptions;

        return builderConfig;
      }),
    );
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

  private _loadJsonFile(path: Path): Observable<JsonObject> {
    return this._workspace.host.read(normalize(path)).pipe(
      map(buffer => virtualFs.fileBufferToString(buffer)),
      map(str => parseJson(str, JsonParseMode.Loose) as {} as JsonObject),
    );
  }
}
