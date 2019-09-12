/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {strings} from '@angular-devkit/core';
import {
  apply,
  chain,
  externalSchematic,
  mergeWith,
  Rule,
  SchematicContext,
  template,
  Tree,
  move,
  url,
} from '@angular-devkit/schematics';
import {NodePackageInstallTask} from '@angular-devkit/schematics/tasks';
import {Schema as UniversalOptions} from './schema';
import {
  addPackageJsonDependency,
  NodeDependencyType,
} from '@schematics/angular/utility/dependencies';
import {
  getClientProject,
  stripTsExtension,
  getDistPaths,
} from '@nguniversal/common/schematics/install/utils';

function addDependencies(options: UniversalOptions): Rule {
  return (host: Tree, context: SchematicContext) => {
    if (!options.skipInstall) {
      context.addTask(new NodePackageInstallTask());
    }
    addPackageJsonDependency(host, {
      type: NodeDependencyType.Default,
      name: '@nguniversal/hapi-engine',
      version: '0.0.0-PLACEHOLDER',
    });
    addPackageJsonDependency(host, {
      type: NodeDependencyType.Default,
      name: 'hapi',
      version: 'HAPI_VERSION',
    });
    addPackageJsonDependency(host, {
      type: NodeDependencyType.Default,
      name: 'inert',
      version: '^5.1.0',
    });
    return host;
  };
}

export default function (options: UniversalOptions): Rule {
  return async (host: Tree) => {
    const clientProject = await getClientProject(host, options.clientProject);
    const {browser} = await getDistPaths(host, options.clientProject);

    const rootSource = apply(url('./files'), [
      template({
        ...strings,
        ...options,
        stripTsExtension,
        browserDistDirectory: browser
      }),
      move(clientProject.root)
    ]);

    // Under bazel the collection needs to be resolved differently
    const ngCommonUniversalCollection = process.env.BAZEL_TARGET
      ? require.resolve('nguniversal/modules/common/schematics/npm_package/collection.json')
      : '@nguniversal/common';

    return chain([
      mergeWith(rootSource),
      externalSchematic(ngCommonUniversalCollection, 'install', options),
      addDependencies(options),
    ]);
  };
}
