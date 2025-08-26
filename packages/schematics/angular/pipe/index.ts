/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { chain, strings } from '@angular-devkit/schematics';
import { addDeclarationToNgModule } from '../utility/add-declaration-to-ng-module';
import { findModuleFromOptions } from '../utility/find-module';
import { generateFromFiles } from '../utility/generate-from-files';
import { parseName } from '../utility/parse-name';
import { createProjectSchematic } from '../utility/project';
import { validateClassName } from '../utility/validation';
import { createDefaultPath } from '../utility/workspace';
import { Schema as PipeOptions } from './schema';

export default createProjectSchematic<PipeOptions>(async (options, { tree }) => {
  options.path ??= await createDefaultPath(tree, options.project);
  options.module = findModuleFromOptions(tree, options);
  const parsedPath = parseName(options.path, options.name);
  options.name = parsedPath.name;
  options.path = parsedPath.path;
  validateClassName(strings.classify(options.name));

  return chain([
    addDeclarationToNgModule({
      type: 'pipe',
      ...options,
    }),
    generateFromFiles(options),
  ]);
});
