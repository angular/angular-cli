/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Path, getSystemPath, schema, virtualFs } from '@angular-devkit/core';
import {
  workflow,
} from '@angular-devkit/schematics';  // tslint:disable-line:no-implicit-dependencies
import { BuiltinTaskExecutor } from '../../tasks/node';
import { FileSystemEngine } from '../description';
import { NodeModulesEngineHost } from '../node-module-engine-host';

/**
 * A workflow specifically for Node tools.
 */
export class NodeWorkflow extends workflow.BaseWorkflow {
  constructor(
    host: virtualFs.Host,
    options: {
      force?: boolean;
      dryRun?: boolean;
      root?: Path;
      packageManager?: string;
      registry?: schema.CoreSchemaRegistry;
    },
  ) {
    const engineHost = new NodeModulesEngineHost();
    super({
      host,
      engineHost,

      force: options.force,
      dryRun: options.dryRun,
      registry: options.registry,
    });

    engineHost.registerTaskExecutor(
      BuiltinTaskExecutor.NodePackage,
      {
        allowPackageManagerOverride: true,
        packageManager: options.packageManager,
        rootDirectory: options.root && getSystemPath(options.root),
      },
    );
    engineHost.registerTaskExecutor(
      BuiltinTaskExecutor.RepositoryInitializer,
      {
        rootDirectory: options.root && getSystemPath(options.root),
      },
    );
    engineHost.registerTaskExecutor(BuiltinTaskExecutor.RunSchematic);
    engineHost.registerTaskExecutor(BuiltinTaskExecutor.TslintFix);

    this._context = [];
  }

  get engine(): FileSystemEngine {
    return this._engine as {} as FileSystemEngine;
  }
  get engineHost(): NodeModulesEngineHost {
    return this._engineHost as NodeModulesEngineHost;
  }
}
