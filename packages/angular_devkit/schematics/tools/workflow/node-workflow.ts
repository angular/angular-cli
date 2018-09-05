/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Path, getSystemPath, virtualFs } from '@angular-devkit/core';
import {
  workflow,
} from '@angular-devkit/schematics';  // tslint:disable-line:no-implicit-dependencies
import { BuiltinTaskExecutor } from '../../tasks/node';
import { NodeModulesEngineHost } from '../node-module-engine-host';
import { validateOptionsWithSchema } from '../schema-option-transform';

/**
 * A workflow specifically for Node tools.
 */
export class NodeWorkflow extends workflow.BaseWorkflow {
  constructor(
    host: virtualFs.Host,
    options: {
      force?: boolean;
      dryRun?: boolean;
      root?: Path,
      packageManager?: string;
    },
  ) {
    const engineHost = new NodeModulesEngineHost();
    super({
      host: host,
      engineHost: engineHost,

      force: options.force,
      dryRun: options.dryRun,
    });

    engineHost.registerOptionsTransform(validateOptionsWithSchema(this._registry));

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
}
