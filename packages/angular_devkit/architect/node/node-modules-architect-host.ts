/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { json, workspaces } from '@angular-devkit/core';
import * as path from 'path';
import * as v8 from 'v8';
import { BuilderInfo } from '../src';
import { Schema as BuilderSchema } from '../src/builders-schema';
import { Target } from '../src/input-schema';
import { ArchitectHost, Builder, BuilderSymbol } from '../src/internal';

export type NodeModulesBuilderInfo = BuilderInfo & {
  import: string;
};

function clone(obj: unknown): unknown {
  const serialize = ((v8 as unknown) as { serialize(value: unknown): Buffer }).serialize;
  const deserialize = ((v8 as unknown) as { deserialize(buffer: Buffer): unknown }).deserialize;

  try {
    return deserialize(serialize(obj));
  } catch {
    return JSON.parse(JSON.stringify(obj));
  }
}

// TODO: create a base class for all workspace related hosts.
export class WorkspaceNodeModulesArchitectHost implements ArchitectHost<NodeModulesBuilderInfo> {
  constructor(protected _workspace: workspaces.WorkspaceDefinition, protected _root: string) {}

  async getBuilderNameForTarget(target: Target) {
    const targetDefinition = this.findProjectTarget(target);
    if (!targetDefinition) {
      throw new Error('Project target does not exist.');
    }

    return targetDefinition.builder;
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
    const targetSpec = this.findProjectTarget(target);
    if (targetSpec === undefined) {
      return null;
    }

    let additionalOptions = {};

    if (target.configuration) {
      const configurations = target.configuration.split(',').map(c => c.trim());
      for (const configuration of configurations) {
        if (!(targetSpec['configurations'] && targetSpec['configurations'][configuration])) {
          throw new Error(`Configuration '${configuration}' is not set in the workspace.`);
        } else {
          additionalOptions = {
            ...additionalOptions,
            ...targetSpec['configurations'][configuration],
          };
        }
      }
    }

    const options = {
      ...targetSpec['options'],
      ...additionalOptions,
    };

    return clone(options) as json.JsonObject;
  }

  async getProjectMetadata(target: Target | string): Promise<json.JsonObject | null> {
    const projectName = typeof target === 'string' ? target : target.project;

    const projectDefinition = this._workspace.projects.get(projectName);
    if (!projectDefinition) {
      throw new Error('Project does not exist.');
    }

    const metadata = ({
      root: projectDefinition.root,
      sourceRoot: projectDefinition.sourceRoot,
      prefix: projectDefinition.prefix,
      ...clone(projectDefinition.extensions) as {},
    } as unknown) as json.JsonObject;

    return metadata;
  }

  async loadBuilder(info: NodeModulesBuilderInfo): Promise<Builder> {
    const builder = (await import(info.import)).default;
    if (builder[BuilderSymbol]) {
      return builder;
    }

    throw new Error('Builder is not a builder');
  }

  private findProjectTarget(target: Target) {
    const projectDefinition = this._workspace.projects.get(target.project);
    if (!projectDefinition) {
      throw new Error('Project does not exist.');
    }

    return projectDefinition.targets.get(target.target);
  }
}
