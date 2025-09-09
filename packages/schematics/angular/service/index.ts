/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { Rule, strings } from '@angular-devkit/schematics';
import { generateFromFiles } from '../utility/generate-from-files';
import { parseName } from '../utility/parse-name';
import { createProjectSchematic } from '../utility/project';
import { validateClassName } from '../utility/validation';
import { buildDefaultPath } from '../utility/workspace';
import { Schema as ServiceOptions } from './schema';

export default createProjectSchematic<ServiceOptions>((options, { project, tree }) => {
  if (options.path === undefined) {
    options.path = buildDefaultPath(project);
  }

  const parsedPath = parseName(options.path, options.name);
  options.name = parsedPath.name;
  options.path = parsedPath.path;

  const classifiedName =
    strings.classify(options.name) +
    (options.addTypeToClassName && options.type ? strings.classify(options.type) : '');
  validateClassName(classifiedName);

  return generateFromFiles({
    ...options,
    classifiedName,
  });
});
