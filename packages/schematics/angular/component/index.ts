/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {
  FileOperator,
  Rule,
  SchematicsException,
  Tree,
  apply,
  applyTemplates,
  chain,
  filter,
  forEach,
  mergeWith,
  move,
  noop,
  strings,
  url,
} from '@angular-devkit/schematics';
import { addDeclarationToNgModule } from '../utility/add-declaration-to-ng-module';
import { findModuleFromOptions } from '../utility/find-module';
import { parseName } from '../utility/parse-name';
import { validateClassName, validateHtmlSelector } from '../utility/validation';
import { buildDefaultPath, getWorkspace } from '../utility/workspace';
import { Schema as ComponentOptions, Style } from './schema';

function buildSelector(options: ComponentOptions, projectPrefix: string) {
  let selector = strings.dasherize(options.name);
  if (options.prefix) {
    selector = `${options.prefix}-${selector}`;
  } else if (options.prefix === undefined && projectPrefix) {
    selector = `${projectPrefix}-${selector}`;
  }

  return selector;
}

export default function (options: ComponentOptions): Rule {
  return async (host: Tree) => {
    const workspace = await getWorkspace(host);
    const project = workspace.projects.get(options.project);

    if (!project) {
      throw new SchematicsException(`Project "${options.project}" does not exist.`);
    }

    if (options.path === undefined) {
      options.path = buildDefaultPath(project);
    }

    try {
      options.module = findModuleFromOptions(host, options);
    } catch {
      options.module = findModuleFromOptions(host, {
        ...options,
        moduleExt: '-module.ts',
        routingModuleExt: '-routing-module.ts',
      });
    }

    // Schematic templates require a defined type value
    options.type ??= '';

    const parsedPath = parseName(options.path, options.name);
    options.name = parsedPath.name;
    options.path = parsedPath.path;
    options.selector =
      options.selector || buildSelector(options, (project && project.prefix) || '');

    validateHtmlSelector(options.selector);
    validateClassName(strings.classify(options.name));

    const skipStyleFile = options.inlineStyle || options.style === Style.None;
    const templateSource = apply(url('./files'), [
      options.skipTests ? filter((path) => !path.endsWith('.spec.ts.template')) : noop(),
      skipStyleFile ? filter((path) => !path.endsWith('.__style__.template')) : noop(),
      options.inlineTemplate ? filter((path) => !path.endsWith('.html.template')) : noop(),
      applyTemplates({
        ...strings,
        'if-flat': (s: string) => (options.flat ? '' : s),
        'ngext': options.ngHtml ? '.ng' : '',
        ...options,
      }),
      !options.type
        ? forEach(((file) => {
            return file.path.includes('..')
              ? {
                  content: file.content,
                  path: file.path.replace('..', '.'),
                }
              : file;
          }) as FileOperator)
        : noop(),
      move(parsedPath.path),
    ]);

    return chain([
      addDeclarationToNgModule({
        type: 'component',
        ...options,
      }),
      mergeWith(templateSource),
    ]);
  };
}
