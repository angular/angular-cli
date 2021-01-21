/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Path, getSystemPath, normalize, schema, virtualFs } from '@angular-devkit/core';
import { NodeJsSyncHost } from '@angular-devkit/core/node';
import {
  workflow,
} from '@angular-devkit/schematics';  // tslint:disable-line:no-implicit-dependencies
import { BuiltinTaskExecutor } from '../../tasks/node';
import { FileSystemEngine } from '../description';
import { OptionTransform } from '../file-system-engine-host-base';
import { NodeModulesEngineHost } from '../node-module-engine-host';
import { validateOptionsWithSchema } from '../schema-option-transform';

export interface NodeWorkflowOptions {
  force?: boolean;
  dryRun?: boolean;
  packageManager?: string;
  packageRegistry?: string;
  registry?: schema.CoreSchemaRegistry;
  resolvePaths?: string[];
  schemaValidation?: boolean;
  optionTransforms?: OptionTransform<object, object>[];
  engineHostCreator?: (options: NodeWorkflowOptions) => NodeModulesEngineHost;
}

/**
 * A workflow specifically for Node tools.
 */
export class NodeWorkflow extends workflow.BaseWorkflow {
  constructor(root: string, options: NodeWorkflowOptions);

  constructor(host: virtualFs.Host, options: NodeWorkflowOptions & { root?: Path });

  constructor(hostOrRoot: virtualFs.Host | string, options: NodeWorkflowOptions & { root?: Path }) {
    let host;
    let root;
    if (typeof hostOrRoot === 'string') {
      root = normalize(hostOrRoot);
      host = new virtualFs.ScopedHost(new NodeJsSyncHost(), root);
    } else {
      host = hostOrRoot;
      root = options.root;
    }

    const engineHost =
      options.engineHostCreator?.(options) || new NodeModulesEngineHost(options.resolvePaths);
    super({
      host,
      engineHost,

      force: options.force,
      dryRun: options.dryRun,
      registry: options.registry,
    });

    engineHost.registerTaskExecutor(BuiltinTaskExecutor.NodePackage, {
      allowPackageManagerOverride: true,
      packageManager: options.packageManager,
      rootDirectory: root && getSystemPath(root),
      registry: options.packageRegistry,
    });
    engineHost.registerTaskExecutor(BuiltinTaskExecutor.RepositoryInitializer, {
      rootDirectory: root && getSystemPath(root),
    });
    engineHost.registerTaskExecutor(BuiltinTaskExecutor.RunSchematic);
    engineHost.registerTaskExecutor(BuiltinTaskExecutor.TslintFix);

    if (options.optionTransforms) {
      for (const transform of options.optionTransforms) {
        engineHost.registerOptionsTransform(transform);
      }
    }

    if (options.schemaValidation) {
      engineHost.registerOptionsTransform(validateOptionsWithSchema(this.registry));
    }

    this._context = [];
  }

  get engine(): FileSystemEngine {
    return this._engine as FileSystemEngine;
  }
  get engineHost(): NodeModulesEngineHost {
    return this._engineHost as NodeModulesEngineHost;
  }
}
