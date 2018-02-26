/**
* @license
* Copyright Google Inc. All Rights Reserved.
*
* Use of this source code is governed by an MIT-style license that can be
* found in the LICENSE file at https://angular.io/license
*/
import { Path, join } from '@angular-devkit/core';
import {
  Rule,
  SchematicContext,
  Tree,
  apply,
  branchAndMerge,
  chain,
  externalSchematic,
  mergeWith,
  move,
  template,
  url,
} from '@angular-devkit/schematics';
import { getWorkspace } from '../utility/config';
import { Schema as PwaOptions } from './schema';


function addServiceWorker(options: PwaOptions): Rule {
  return (host: Tree, context: SchematicContext) => {
    context.logger.debug('Adding service worker...');

    return externalSchematic('@schematics/angular', 'service-worker', options)(host, context);
  };
}

export default function (options: PwaOptions): Rule {
  return (host: Tree, context: SchematicContext) => {
    const workspace = getWorkspace(host);
    const project = workspace.projects[options.project];

    const assetPath = join(project.root as Path, 'src', 'assets');

    const tempalteSource = apply(url('./files/assets'), [
      template({
        ...options,
      }),
      move(assetPath),
    ]);

    return chain([
      addServiceWorker(options),
      branchAndMerge(chain([
        mergeWith(tempalteSource),
      ])),
    ])(host, context);
  };
}
