/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { TaskExecutor, TaskExecutorFactory } from '../../src';
import NodePackageExecutor from '../package-manager/executor';
import { NodePackageName, NodePackageTaskFactoryOptions } from '../package-manager/options';
import RepositoryInitializerExecutor from '../repo-init/executor';
import {
  RepositoryInitializerName,
  RepositoryInitializerTaskFactoryOptions,
} from '../repo-init/options';
import RunSchematicExecutor from '../run-schematic/executor';
import { RunSchematicName } from '../run-schematic/options';

export class BuiltinTaskExecutor {
  static readonly NodePackage: TaskExecutorFactory<NodePackageTaskFactoryOptions> = {
    name: NodePackageName,
    create: async (options) => NodePackageExecutor(options) as TaskExecutor<{}>,
  };
  static readonly RepositoryInitializer: TaskExecutorFactory<RepositoryInitializerTaskFactoryOptions> =
    {
      name: RepositoryInitializerName,
      create: async (options) => RepositoryInitializerExecutor(options) as TaskExecutor<{}>,
    };
  static readonly RunSchematic: TaskExecutorFactory<{}> = {
    name: RunSchematicName,
    create: async () => RunSchematicExecutor() as TaskExecutor<{}>,
  };
}
