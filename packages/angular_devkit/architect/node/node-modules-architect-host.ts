/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { experimental, json, workspaces } from '@angular-devkit/core';
import { resolve } from '@angular-devkit/core/node';
import * as path from 'path';
import { BuilderInfo } from '../src';
import { Schema as BuilderSchema } from '../src/builders-schema';
import { Target } from '../src/input-schema';
import { ArchitectHost, Builder, BuilderSymbol } from '../src/internal';


export type NodeModulesBuilderInfo = BuilderInfo & {
  import: string;
};


// TODO: create a base class for all workspace related hosts.
export class WorkspaceNodeModulesArchitectHost implements ArchitectHost<NodeModulesBuilderInfo> {

  /**
   * @deprecated
   */
  constructor(_workspace: experimental.workspace.Workspace, _root: string)

  constructor(_workspace: workspaces.WorkspaceDefinition, _root: string)

  constructor(
    protected _workspace: experimental.workspace.Workspace | workspaces.WorkspaceDefinition,
    protected _root: string,
  ) {}

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

    const packageJsonPath = resolve(packageName, {
      basedir: this._root,
      checkLocal: true,
      checkGlobal: true,
      resolvePackageJson: true,
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
    if (
      target.configuration
      && !(targetSpec['configurations'] && targetSpec['configurations'][target.configuration])
    ) {
      throw new Error(`Configuration '${target.configuration}' is not set in the workspace.`);
    }

    return {
      ...targetSpec['options'],
      ...(target.configuration ? targetSpec['configurations'][target.configuration] : 0),
    };
  }

  async loadBuilder(info: NodeModulesBuilderInfo): Promise<Builder> {
    const builder = (await import(info.import)).default;
    if (builder[BuilderSymbol]) {
      return builder;
    }

    throw new Error('Builder is not a builder');
  }

  private findProjectTarget(target: Target) {
    // NOTE: Remove conditional when deprecated support for experimental workspace API is removed.
    if ('getProjectTargets' in this._workspace) {
      return this._workspace.getProjectTargets(target.project)[target.target];
    } else {
      const projectDefinition = this._workspace.projects.get(target.project);
      if (!projectDefinition) {
        throw new Error('Project does not exist.');
      }

      return projectDefinition.targets.get(target.target);
    }
  }
}
