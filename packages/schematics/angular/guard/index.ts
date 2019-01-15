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
  SchematicsException,
  Tree,
  apply,
  branchAndMerge,
  chain,
  filter,
  mergeWith,
  move,
  noop,
  template,
  url,
} from '@angular-devkit/schematics';
import { applyLintFix } from '../utility/lint-fix';
import { parseName } from '../utility/parse-name';
import { buildDefaultPath, getProject } from '../utility/project';
import { Schema as GuardOptions } from './schema';


export default function (options: GuardOptions): Rule {
  return (host: Tree) => {
    if (!options.project) {
      throw new SchematicsException('Option (project) is required.');
    }
    const project = getProject(host, options.project);

    if (options.path === undefined) {
      options.path = buildDefaultPath(project);
    }
    if (options.implements === undefined) {
      options.implements = [];
    }

    let implementations = '';
    let implementationImports = '';
    if (options.implements.length > 0) {
      implementations = options.implements.join(', ');
      implementationImports = `${implementations}, `;
      // As long as we aren't in IE... ;)
      if (options.implements.includes('CanLoad')) {
        implementationImports = `${implementationImports}Route, UrlSegment, `;
      }
    }

    const parsedPath = parseName(options.path, options.name);
    options.name = parsedPath.name;
    options.path = parsedPath.path;

    // todo remove these when we remove the deprecations
    options.skipTests = options.skipTests || !options.spec;

    const templateSource = apply(url('./files'), [
      options.skipTests ? filter(path => !path.endsWith('.spec.ts')) : noop(),
      template({
        implementations,
        implementationImports,
        ...strings,
        ...options,
      }),
      move(parsedPath.path),
    ]);

    return chain([
      branchAndMerge(chain([
        mergeWith(templateSource),
      ])),
      options.lintFix ? applyLintFix(options.path) : noop(),
    ]);
  };
}
