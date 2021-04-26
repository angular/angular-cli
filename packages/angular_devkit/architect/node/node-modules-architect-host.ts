/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { json, workspaces } from '@angular-devkit/core';
import * as path from 'path';
import { deserialize, serialize } from 'v8';
import { BuilderInfo } from '../src';
import { Schema as BuilderSchema } from '../src/builders-schema';
import { Target } from '../src/input-schema';
import { ArchitectHost, Builder, BuilderSymbol } from '../src/internal';

export type NodeModulesBuilderInfo = BuilderInfo & {
  import: string;
};

function clone(obj: unknown): unknown {
  try {
    return deserialize(serialize(obj));
  } catch {
    return JSON.parse(JSON.stringify(obj));
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
          const targetDefinition = findProjectTarget(workspaceOrHost, project, target);

          return targetDefinition.builder;
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

          return ({
            root: projectDefinition.root,
            sourceRoot: projectDefinition.sourceRoot,
            prefix: projectDefinition.prefix,
            ...(clone(projectDefinition.extensions) as {}),
          } as unknown) as json.JsonObject;
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
  resolveBuilder(builderStr: string): Promise<NodeModulesBuilderInfo> {
    const [packageName, builderName] = builderStr.split(':', 2);
    if (!builderName) {
      throw new Error('No builder name specified.');
    }

    const packageJsonPath = require.resolve(packageName + '/package.json', {
      paths: [this._root],
    });

    const packageJson = require(packageJsonPath);
    if (!packageJson['builders']) {
      throw new Error(`Package ${JSON.stringify(packageName)} has no builders defined.`);
    }

    const builderJsonPath = path.resolve(path.dirname(packageJsonPath), packageJson['builders']);
    const builderJson = require(builderJsonPath) as BuilderSchema;

    const builder = builderJson.builders && builderJson.builders[builderName];

    if (!builder) {
      throw new Error(`Cannot find builder ${JSON.stringify(builderStr)}.`);
    }

    const importPath = builder.implementation;
    if (!importPath) {
      throw new Error('Could not find the implementation for builder ' + builderStr);
    }

    return Promise.resolve({
      name: builderStr,
      builderName,
      description: builder['description'],
      optionSchema: require(path.resolve(path.dirname(builderJsonPath), builder.schema)),
      import: path.resolve(path.dirname(builderJsonPath), importPath),
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
      target.configuration || await this.workspaceHost.getDefaultConfigurationName(target.project, target.target);

    if (targetConfiguration) {
      const configurations = targetConfiguration.split(',').map((c) => c.trim());
      for (const configuration of configurations) {
        options = {
          ...options,
          ...await this.workspaceHost.getOptions(target.project, target.target, configuration),
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
    const builder = (await import(info.import)).default;
    if (builder[BuilderSymbol]) {
      return builder;
    }

    throw new Error('Builder is not a builder');
  }
}
