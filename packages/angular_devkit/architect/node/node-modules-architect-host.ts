/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { json, workspaces } from '@angular-devkit/core';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { deserialize, serialize } from 'node:v8';
import { BuilderInfo } from '../src';
import { Schema as BuilderSchema } from '../src/builders-schema';
import { Target } from '../src/input-schema';
import { ArchitectHost, Builder, BuilderSymbol } from '../src/internal';

// TODO_ESM: Update to use import.meta.url
const localRequire = createRequire(__filename);

export type NodeModulesBuilderInfo = BuilderInfo & {
  import: string;
};

function clone(obj: unknown): unknown {
  try {
    return deserialize(serialize(obj));
  } catch {
    return JSON.parse(JSON.stringify(obj)) as unknown;
  }
}

export interface WorkspaceHost {
  getBuilderName(project: string, target: string): Promise<string>;
  getMetadata(project: string): Promise<json.JsonObject>;
  getOptions(project: string, target: string, configuration?: string): Promise<json.JsonObject>;
  hasTarget(project: string, target: string): Promise<boolean>;
  getDefaultConfigurationName(project: string, target: string): Promise<string | undefined>;
}

function findProjectTarget(
  workspace: workspaces.WorkspaceDefinition,
  project: string,
  target: string,
): workspaces.TargetDefinition {
  const projectDefinition = workspace.projects.get(project);
  if (!projectDefinition) {
    throw new Error(`Project "${project}" does not exist.`);
  }

  const targetDefinition = projectDefinition.targets.get(target);
  if (!targetDefinition) {
    throw new Error('Project target does not exist.');
  }

  if (!targetDefinition.builder) {
    throw new Error(`A builder is not set for target '${target}' in project '${project}'.`);
  }

  return targetDefinition;
}

export class WorkspaceNodeModulesArchitectHost implements ArchitectHost<NodeModulesBuilderInfo> {
  private workspaceHost: WorkspaceHost;

  constructor(workspaceHost: WorkspaceHost, _root: string);

  constructor(workspace: workspaces.WorkspaceDefinition, _root: string);

  constructor(
    workspaceOrHost: workspaces.WorkspaceDefinition | WorkspaceHost,
    protected _root: string,
  ) {
    if ('getBuilderName' in workspaceOrHost) {
      this.workspaceHost = workspaceOrHost;
    } else {
      this.workspaceHost = {
        async getBuilderName(project, target) {
          const { builder } = findProjectTarget(workspaceOrHost, project, target);

          return builder;
        },
        async getOptions(project, target, configuration) {
          const targetDefinition = findProjectTarget(workspaceOrHost, project, target);

          if (configuration === undefined) {
            return (targetDefinition.options ?? {}) as json.JsonObject;
          }

          if (!targetDefinition.configurations?.[configuration]) {
            throw new Error(`Configuration '${configuration}' is not set in the workspace.`);
          }

          return (targetDefinition.configurations?.[configuration] ?? {}) as json.JsonObject;
        },
        async getMetadata(project) {
          const projectDefinition = workspaceOrHost.projects.get(project);
          if (!projectDefinition) {
            throw new Error(`Project "${project}" does not exist.`);
          }

          return {
            root: projectDefinition.root,
            sourceRoot: projectDefinition.sourceRoot,
            prefix: projectDefinition.prefix,
            ...(clone(workspaceOrHost.extensions) as {}),
            ...(clone(projectDefinition.extensions) as {}),
          } as unknown as json.JsonObject;
        },
        async hasTarget(project, target) {
          return !!workspaceOrHost.projects.get(project)?.targets.has(target);
        },
        async getDefaultConfigurationName(project, target) {
          return workspaceOrHost.projects.get(project)?.targets.get(target)?.defaultConfiguration;
        },
      };
    }
  }

  async getBuilderNameForTarget(target: Target) {
    return this.workspaceHost.getBuilderName(target.project, target.target);
  }

  /**
   * Resolve a builder. This needs to be a string which will be used in a dynamic `import()`
   * clause. This should throw if no builder can be found. The dynamic import will throw if
   * it is unsupported.
   * @param builderStr The name of the builder to be used.
   * @returns All the info needed for the builder itself.
   */
  resolveBuilder(
    builderStr: string,
    basePath = this._root,
    seenBuilders?: Set<string>,
  ): Promise<NodeModulesBuilderInfo> {
    if (seenBuilders?.has(builderStr)) {
      throw new Error(
        'Circular builder alias references detected: ' + [...seenBuilders, builderStr],
      );
    }

    const [packageName, builderName] = builderStr.split(':', 2);
    if (!builderName) {
      throw new Error('No builder name specified.');
    }

    // Resolve and load the builders manifest from the package's `builders` field, if present
    const packageJsonPath = localRequire.resolve(packageName + '/package.json', {
      paths: [basePath],
    });

    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as { builders?: string };
    const buildersManifestRawPath = packageJson['builders'];
    if (!buildersManifestRawPath) {
      throw new Error(`Package ${JSON.stringify(packageName)} has no builders defined.`);
    }

    let buildersManifestPath = path.normalize(buildersManifestRawPath);
    if (path.isAbsolute(buildersManifestRawPath) || buildersManifestRawPath.startsWith('..')) {
      throw new Error(
        `Package "${packageName}" has an invalid builders manifest path: "${buildersManifestRawPath}"`,
      );
    }

    buildersManifestPath = path.join(path.dirname(packageJsonPath), buildersManifestPath);
    const buildersManifest = JSON.parse(
      readFileSync(buildersManifestPath, 'utf-8'),
    ) as BuilderSchema;
    const buildersManifestDirectory = path.dirname(buildersManifestPath);

    // Attempt to locate an entry for the specified builder by name
    const builder = buildersManifest.builders?.[builderName];
    if (!builder) {
      throw new Error(`Cannot find builder ${JSON.stringify(builderStr)}.`);
    }

    // Resolve alias reference if entry is a string
    if (typeof builder === 'string') {
      return this.resolveBuilder(
        builder,
        path.dirname(packageJsonPath),
        (seenBuilders ?? new Set()).add(builderStr),
      );
    }

    // Determine builder implementation path (relative within package only)
    const implementationPath = builder.implementation && path.normalize(builder.implementation);
    if (!implementationPath) {
      throw new Error('Could not find the implementation for builder ' + builderStr);
    }
    if (path.isAbsolute(implementationPath) || implementationPath.startsWith('..')) {
      throw new Error(
        `Package "${packageName}" has an invalid builder implementation path: "${builderName}" --> "${builder.implementation}"`,
      );
    }

    // Determine builder option schema path (relative within package only)
    const schemaPath = builder.schema && path.normalize(builder.schema);
    if (!schemaPath) {
      throw new Error('Could not find the schema for builder ' + builderStr);
    }
    if (path.isAbsolute(schemaPath) || schemaPath.startsWith('..')) {
      throw new Error(
        `Package "${packageName}" has an invalid builder implementation path: "${builderName}" --> "${builder.schema}"`,
      );
    }

    const schemaText = readFileSync(path.join(buildersManifestDirectory, schemaPath), 'utf-8');

    return Promise.resolve({
      name: builderStr,
      builderName,
      description: builder['description'],
      optionSchema: JSON.parse(schemaText) as json.schema.JsonSchema,
      import: path.join(buildersManifestDirectory, implementationPath),
    });
  }

  async getCurrentDirectory() {
    return process.cwd();
  }

  async getWorkspaceRoot() {
    return this._root;
  }

  async getOptionsForTarget(target: Target): Promise<json.JsonObject | null> {
    if (!(await this.workspaceHost.hasTarget(target.project, target.target))) {
      return null;
    }

    let options = await this.workspaceHost.getOptions(target.project, target.target);
    const targetConfiguration =
      target.configuration ||
      (await this.workspaceHost.getDefaultConfigurationName(target.project, target.target));

    if (targetConfiguration) {
      const configurations = targetConfiguration.split(',').map((c) => c.trim());
      for (const configuration of configurations) {
        options = {
          ...options,
          ...(await this.workspaceHost.getOptions(target.project, target.target, configuration)),
        };
      }
    }

    return clone(options) as json.JsonObject;
  }

  async getProjectMetadata(target: Target | string): Promise<json.JsonObject | null> {
    const projectName = typeof target === 'string' ? target : target.project;
    const metadata = this.workspaceHost.getMetadata(projectName);

    return metadata;
  }

  async loadBuilder(info: NodeModulesBuilderInfo): Promise<Builder> {
    const builder = await getBuilder(info.import);

    if (builder[BuilderSymbol]) {
      return builder;
    }

    // Default handling code is for old builders that incorrectly export `default` with non-ESM module
    if (builder?.default[BuilderSymbol]) {
      return builder.default;
    }

    throw new Error('Builder is not a builder');
  }
}

/**
 * Lazily compiled dynamic import loader function.
 */
let load: (<T>(modulePath: string | URL) => Promise<T>) | undefined;

/**
 * This uses a dynamic import to load a module which may be ESM.
 * CommonJS code can load ESM code via a dynamic import. Unfortunately, TypeScript
 * will currently, unconditionally downlevel dynamic import into a require call.
 * require calls cannot load ESM code and will result in a runtime error. To workaround
 * this, a Function constructor is used to prevent TypeScript from changing the dynamic import.
 * Once TypeScript provides support for keeping the dynamic import this workaround can
 * be dropped.
 *
 * @param modulePath The path of the module to load.
 * @returns A Promise that resolves to the dynamically imported module.
 */
export function loadEsmModule<T>(modulePath: string | URL): Promise<T> {
  load ??= new Function('modulePath', `return import(modulePath);`) as Exclude<
    typeof load,
    undefined
  >;

  return load(modulePath);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getBuilder(builderPath: string): Promise<any> {
  switch (path.extname(builderPath)) {
    case '.mjs':
      // Load the ESM configuration file using the TypeScript dynamic import workaround.
      // Once TypeScript provides support for keeping the dynamic import this workaround can be
      // changed to a direct dynamic import.
      return (await loadEsmModule<{ default: unknown }>(pathToFileURL(builderPath))).default;
    case '.cjs':
      return localRequire(builderPath);
    default:
      // The file could be either CommonJS or ESM.
      // CommonJS is tried first then ESM if loading fails.
      try {
        return localRequire(builderPath);
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code === 'ERR_REQUIRE_ESM') {
          // Load the ESM configuration file using the TypeScript dynamic import workaround.
          // Once TypeScript provides support for keeping the dynamic import this workaround can be
          // changed to a direct dynamic import.
          return (await loadEsmModule<{ default: unknown }>(pathToFileURL(builderPath))).default;
        }

        throw e;
      }
  }
}
