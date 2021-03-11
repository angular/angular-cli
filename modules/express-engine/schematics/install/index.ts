/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { strings } from '@angular-devkit/core';
import {
  Rule,
  SchematicContext,
  Tree,
  apply,
  chain,
  mergeWith,
  move,
  template,
  url,
} from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import { addUniversalCommonRule } from '@nguniversal/common/schematics/add';
import {
  getOutputPath,
  getProject,
  stripTsExtension,
} from '@nguniversal/common/schematics/utils';
import {
  NodeDependencyType,
  addPackageJsonDependency,
} from '@schematics/angular/utility/dependencies';
import { Schema as UniversalOptions } from './schema';

function addDependencies(options: UniversalOptions): Rule {
  return (host: Tree, context: SchematicContext) => {
    if (!options.skipInstall) {
      context.addTask(new NodePackageInstallTask());
    }
    addPackageJsonDependency(host, {
      type: NodeDependencyType.Default,
      name: '@nguniversal/express-engine',
      version: '^0.0.0-PLACEHOLDER',
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

function addServerFile(options: UniversalOptions): Rule {
  return async host => {
    const clientProject = await getProject(host, options.clientProject);
    const browserDistDirectory = await getOutputPath(host, options.clientProject, 'build');

    return mergeWith(
        apply(url('./files'), [
        template({
          ...strings,
          ...options,
          stripTsExtension,
          browserDistDirectory,
        }),
        move(clientProject.root)
      ])
    );
  };
}

export default function (options: UniversalOptions): Rule {
  return () => {
    const addUniversalCommonOptions = {
      ...options
    };

    delete addUniversalCommonOptions.serverPort;
    delete addUniversalCommonOptions.tsconfigFileName;

    return chain([
      addUniversalCommonRule(addUniversalCommonOptions),
      addServerFile(options),
      addDependencies(options),
    ]);
  };
}
