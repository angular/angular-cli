/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
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
  branchAndMerge,
  chain,
  mergeWith,
  move,
  template,
  url,
} from '@angular-devkit/schematics';
import { getWorkspace } from '../utility/config';
import { parseName } from '../utility/parse-name';
import { Schema as InterfaceOptions } from './schema';


export default function (options: InterfaceOptions): Rule {
  return (host: Tree, context: SchematicContext) => {
    const workspace = getWorkspace(host);
    if (!options.project) {
      options.project = Object.keys(workspace.projects)[0];
    }
    const project = workspace.projects[options.project];

    if (options.path === undefined) {
      options.path = `/${project.root}/src`;
    }

    const parsedPath = parseName(options.path, options.name);
    options.name = parsedPath.name;
    options.path = parsedPath.path;

    options.prefix = options.prefix ? options.prefix : '';
    options.type = !!options.type ? `.${options.type}` : '';

    const templateSource = apply(url('./files'), [
      template({
        ...strings,
        ...options,
      }),
      move(parsedPath.path),
    ]);

    return chain([
      branchAndMerge(chain([
        mergeWith(templateSource),
      ])),
    ])(host, context);
  };
}
