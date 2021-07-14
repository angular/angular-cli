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
import { applyLintFix } from './lint-fix';
import { parseName } from './parse-name';
import { createDefaultPath } from './workspace';

export interface GenerateFromFilesOptions {
  flat?: boolean;
  lintFix?: boolean;
  name: string;
  path?: string;
  prefix?: string;
  project?: string;
  skipTests?: boolean;
}

export function generateFromFiles(
  options: GenerateFromFilesOptions,
  extraTemplateValues: Record<string, string | ((v: string) => string)> = {},
): Rule {
  return async (host: Tree) => {
    options.path ??= await createDefaultPath(host, options.project as string);
    options.prefix ??= '';
    options.flat ??= true;

    const parsedPath = parseName(options.path, options.name);
    options.name = parsedPath.name;
    options.path = parsedPath.path;

    const templateSource = apply(url('./files'), [
      options.skipTests ? filter((path) => !path.endsWith('.spec.ts.template')) : noop(),
      applyTemplates({
        ...strings,
        ...options,
        ...extraTemplateValues,
      }),
      move(parsedPath.path + (options.flat ? '' : '/' + strings.dasherize(options.name))),
    ]);

    return chain([
      mergeWith(templateSource),
      options.lintFix ? applyLintFix(options.path) : noop(),
    ]);
  };
}
