/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

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
  strings,
  url,
} from '@angular-devkit/schematics';
import { addDeclarationToNgModule } from '../utility/add-declaration-to-ng-module';
import { findModuleFromOptions } from '../utility/find-module';
import { parseName } from '../utility/parse-name';
import { validateClassName } from '../utility/validation';
import { createDefaultPath } from '../utility/workspace';
import { Schema as PipeOptions } from './schema';

export default function (options: PipeOptions): Rule {
  return async (host: Tree) => {
    options.path ??= await createDefaultPath(host, options.project as string);
    options.module = findModuleFromOptions(host, options);

    const parsedPath = parseName(options.path, options.name);
    options.name = parsedPath.name;
    options.path = parsedPath.path;
    validateClassName(strings.classify(options.name));

    const templateSource = apply(url('./files'), [
      options.skipTests ? filter((path) => !path.endsWith('.spec.ts.template')) : noop(),
      applyTemplates({
        ...strings,
        'if-flat': (s: string) => (options.flat ? '' : s),
        ...options,
      }),
      move(parsedPath.path),
    ]);

    return chain([
      addDeclarationToNgModule({
        type: 'pipe',

        ...options,
      }),
      mergeWith(templateSource),
    ]);
  };
}
