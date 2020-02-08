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
  Tree,
  apply,
  applyTemplates,
  chain,
  filter,
  mergeWith,
  move,
  noop,
  rename,
  url,
} from '@angular-devkit/schematics';
import { applyLintFix } from '../utility/lint-fix';
import { parseName } from '../utility/parse-name';
import { createDefaultPath, getWorkspace } from '../utility/workspace';
import { Schema as ServiceOptions } from './schema';

export default function (options: ServiceOptions): Rule {
  return async (host: Tree) => {
    const workspace = await getWorkspace(host);
    const project = workspace.projects.get(options.project as string);
    if (options.path === undefined) {
      options.path = await createDefaultPath(host, options.project as string);
    }

    const regType = new RegExp('.service.');
    const parsedPath = parseName(options.path, options.name);
    options.name = parsedPath.name;
    options.path = parsedPath.path;
    options.noSuffix = options.noSuffix || (project && project.noSuffix ? project.noSuffix : false);

    const templateSource = apply(url('./files'), [
      options.skipTests ? filter(path => !path.endsWith('.spec.ts.template')) : noop(),
      applyTemplates({
        ...strings,
        'if-flat': (s: string) => options.flat ? '' : s,
        ...options,
      }),
      options.noSuffix ? rename(name => !!name.match(regType), (name) => name.replace(regType, '.')) : noop(),
      move(parsedPath.path),
    ]);

    return chain([
      mergeWith(templateSource),
      options.lintFix ? applyLintFix(options.path) : noop(),
    ]);
  };
}
