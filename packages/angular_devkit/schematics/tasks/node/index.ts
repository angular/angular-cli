/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { TaskExecutorFactory } from '../../src';
import { NodePackageName, NodePackageTaskFactoryOptions } from '../node-package/options';
import {
  RepositoryInitializerName,
  RepositoryInitializerTaskFactoryOptions,
 } from '../repo-init/options';
import { RunSchematicName } from '../run-schematic/options';
import { TslintFixName } from '../tslint-fix/options';

export class BuiltinTaskExecutor {
  static readonly NodePackage: TaskExecutorFactory<NodePackageTaskFactoryOptions> = {
    name: NodePackageName,
    create: (options) => import('../node-package/executor').then(mod => mod.default(options)),
  };
  static readonly RepositoryInitializer:
    TaskExecutorFactory<RepositoryInitializerTaskFactoryOptions> = {
    name: RepositoryInitializerName,
    create: (options) => import('../repo-init/executor').then(mod => mod.default(options)),
  };
  static readonly RunSchematic: TaskExecutorFactory<{}> = {
    name: RunSchematicName,
    create: () => import('../run-schematic/executor').then(mod => mod.default()),
  };
  static readonly TslintFix: TaskExecutorFactory<{}> = {
    name: TslintFixName,
    create: () => import('../tslint-fix/executor').then(mod => mod.default()),
  };
}
