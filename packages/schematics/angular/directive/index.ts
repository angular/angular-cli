/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { Rule, SchematicsException, Tree, chain, strings } from '@angular-devkit/schematics';
import { addDeclarationToNgModule } from '../utility/add-declaration-to-ng-module';
import { findModuleFromOptions } from '../utility/find-module';
import { generateFromFiles } from '../utility/generate-from-files';
import { parseName } from '../utility/parse-name';
import { validateClassName, validateHtmlSelector } from '../utility/validation';
import { buildDefaultPath, getWorkspace } from '../utility/workspace';
import { Schema as DirectiveOptions } from './schema';

function buildSelector(options: DirectiveOptions, projectPrefix: string) {
  let selector = options.name;
  if (options.prefix) {
    selector = `${options.prefix}-${selector}`;
  } else if (options.prefix === undefined && projectPrefix) {
    selector = `${projectPrefix}-${selector}`;
  }

  return strings.camelize(selector);
}

export default function (options: DirectiveOptions): Rule {
  return async (host: Tree) => {
    const workspace = await getWorkspace(host);
    const project = workspace.projects.get(options.project);
    if (!project) {
      throw new SchematicsException(`Project "${options.project}" does not exist.`);
    }

    if (options.path === undefined) {
      options.path = buildDefaultPath(project);
    }

    options.module = findModuleFromOptions(host, options);
    const parsedPath = parseName(options.path, options.name);
    options.name = parsedPath.name;
    options.path = parsedPath.path;
    options.selector = options.selector || buildSelector(options, project.prefix || '');

    validateHtmlSelector(options.selector);
    validateClassName(strings.classify(options.name));

    return chain([
      addDeclarationToNgModule({
        type: 'directive',

        ...options,
      }),
      generateFromFiles(options),
    ]);
  };
}
