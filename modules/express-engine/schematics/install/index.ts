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
  getProject,
  stripTsExtension,
  getDistPaths,
} from '@nguniversal/common/schematics/utils';
import {addUniversalCommonRule} from '@nguniversal/common/schematics/add';

function addDependencies(options: UniversalOptions): Rule {
  return (host: Tree, context: SchematicContext) => {
    if (!options.skipInstall) {
      context.addTask(new NodePackageInstallTask());
    }
    addPackageJsonDependency(host, {
      type: NodeDependencyType.Default,
      name: '@nguniversal/express-engine',
      version: '0.0.0-PLACEHOLDER',
    });
    addPackageJsonDependency(host, {
      type: NodeDependencyType.Default,
      name: 'express',
      version: 'EXPRESS_VERSION',
    });
    addPackageJsonDependency(host, {
      type: NodeDependencyType.Dev,
      name: '@types/express',
      version: 'EXPRESS_TYPES_VERSION',
    });
    return host;
  };
}

export default function (options: UniversalOptions): Rule {
  return async (host: Tree) => {
    const clientProject = await getProject(host, options.clientProject);
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

    return chain([
      mergeWith(rootSource),
      addUniversalCommonRule(options),
      addDependencies(options),
    ]);
  };
}
