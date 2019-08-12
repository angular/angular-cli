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
  applyTemplates,
  chain,
  filter,
  mergeWith,
  move,
  noop,
  url,
} from '@angular-devkit/schematics';
import { applyLintFix } from '../utility/lint-fix';
import { parseName } from '../utility/parse-name';
import { createDefaultPath } from '../utility/workspace';
import { Implement as GuardInterface, Schema as GuardOptions } from './schema';


export default function (options: GuardOptions): Rule {
  return async (host: Tree) => {
    if (options.path === undefined) {
      options.path = await createDefaultPath(host, options.project as string);
    }

    if (!options.implements) {
      throw new SchematicsException('Option "implements" is required.');
    }

    const implementations = options.implements.join(', ');
    let implementationImports = `${implementations}, `;
    // As long as we aren't in IE... ;)
    if (options.implements.includes(GuardInterface.CanLoad)) {
      implementationImports = `${implementationImports}Route, UrlSegment, `;
    }

    const parsedPath = parseName(options.path, options.name);
    options.name = parsedPath.name;
    options.path = parsedPath.path;

    // todo remove these when we remove the deprecations
    options.skipTests = options.skipTests || !options.spec;

    const templateSource = apply(url('./files'), [
      options.skipTests ? filter(path => !path.endsWith('.spec.ts.template')) : noop(),
      applyTemplates({
        implementations,
        implementationImports,
        ...strings,
        ...options,
      }),
      move(parsedPath.path + (options.flat ? '' : '/' + strings.dasherize(options.name))),
    ]);

    return chain([
      mergeWith(templateSource),
      options.lintFix ? applyLintFix(options.path) : noop(),
    ]);
  };
}
