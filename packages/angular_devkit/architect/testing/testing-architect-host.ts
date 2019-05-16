/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { json } from '@angular-devkit/core';
import { BuilderInfo, Target, targetStringFromTarget } from '../src';
import { ArchitectHost, Builder } from '../src/internal';

export class TestingArchitectHost implements ArchitectHost {
  private _builderImportMap = new Map<string, Builder>();
  private _builderMap = new Map<string, BuilderInfo>();
  private _targetMap = new Map<string, { builderName: string, options: json.JsonObject }>();

  /**
   * Can provide a backend host, in case of integration tests.
   * @param workspaceRoot The workspace root to use.
   * @param currentDirectory The current directory to use.
   * @param _backendHost A host to defer calls that aren't resolved here.
   */
  constructor(
    public workspaceRoot = '',
    public currentDirectory = workspaceRoot,
    private _backendHost: ArchitectHost | null = null,
  ) {}

  addBuilder(
    builderName: string,
    builder: Builder,
    description = 'Testing only builder.',
    optionSchema: json.schema.JsonSchema = { type: 'object' },
  ) {
    this._builderImportMap.set(builderName, builder);
    this._builderMap.set(builderName, { builderName, description, optionSchema });
  }
  async addBuilderFromPackage(packageName: string) {
    const packageJson = await import(packageName + '/package.json');
    if (!('builders' in packageJson)) {
      throw new Error('Invalid package.json, builders key not found.');
    }

    if (!packageJson.name) {
      throw new Error('Invalid package name');
    }

    const builderJsonPath = packageName + '/' + packageJson['builders'];
    const builderJson = await import(builderJsonPath);
    const builders = builderJson['builders'];
    if (!builders) {
      throw new Error('Invalid builders.json, builders key not found.');
    }

    for (const builderName of Object.keys(builders)) {
      const b = builders[builderName];
      // TODO: remove this check as v1 is not supported anymore.
      if (!b.implementation) { continue; }
      const handler = (await import(builderJsonPath + '/../' + b.implementation)).default;
      const optionsSchema = await import(builderJsonPath + '/../' + b.schema);
      this.addBuilder(`${packageJson.name}:${builderName}`, handler, b.description, optionsSchema);
    }
  }
  addTarget(target: Target, builderName: string, options: json.JsonObject = {}) {
    this._targetMap.set(targetStringFromTarget(target), { builderName, options });
  }

  async getBuilderNameForTarget(target: Target): Promise<string | null> {
    const name = targetStringFromTarget(target);
    const maybeTarget = this._targetMap.get(name);
    if (!maybeTarget) {
      return this._backendHost && this._backendHost.getBuilderNameForTarget(target);
    }

    return maybeTarget.builderName;
  }

  /**
   * Resolve a builder. This needs to return a string which will be used in a dynamic `import()`
   * clause. This should throw if no builder can be found. The dynamic import will throw if
   * it is unsupported.
   * @param builderName The name of the builder to be used.
   * @returns All the info needed for the builder itself.
   */
  async resolveBuilder(builderName: string): Promise<BuilderInfo | null> {
    return this._builderMap.get(builderName)
        || (this._backendHost && this._backendHost.resolveBuilder(builderName));
  }

  async getCurrentDirectory(): Promise<string> {
    return this.currentDirectory;
  }
  async getWorkspaceRoot(): Promise<string> {
    return this.workspaceRoot;
  }

  async getOptionsForTarget(target: Target): Promise<json.JsonObject | null> {
    const name = targetStringFromTarget(target);
    const maybeTarget = this._targetMap.get(name);
    if (!maybeTarget) {
      return this._backendHost && this._backendHost.getOptionsForTarget(target);
    }

    return maybeTarget.options;
  }

  async loadBuilder(info: BuilderInfo): Promise<Builder | null> {
    return this._builderImportMap.get(info.builderName)
        || (this._backendHost && this._backendHost.loadBuilder(info));
  }

}
