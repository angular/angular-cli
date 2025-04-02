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
import { parseName } from './parse-name';
import { validateClassName } from './validation';
import { createDefaultPath } from './workspace';

export interface GenerateFromFilesOptions {
  flat?: boolean;
  name: string;
  path?: string;
  prefix?: string;
  project: string;
  skipTests?: boolean;
  templateFilesDirectory?: string;
  type?: string;
}

export function generateFromFiles(
  options: GenerateFromFilesOptions,
  extraTemplateValues: Record<string, string | ((v: string) => string)> = {},
): Rule {
  return async (host: Tree) => {
    options.path ??= await createDefaultPath(host, options.project);
    options.prefix ??= '';
    options.flat ??= true;

    // Schematic templates require a defined type value
    options.type ??= '';

    const parsedPath = parseName(options.path, options.name);
    options.name = parsedPath.name;
    options.path = parsedPath.path;

    validateClassName(strings.classify(options.name));

    const templateFilesDirectory = options.templateFilesDirectory ?? './files';
    const templateSource = apply(url(templateFilesDirectory), [
      options.skipTests ? filter((path) => !path.endsWith('.spec.ts.template')) : noop(),
      applyTemplates({
        ...strings,
        ...options,
        ...extraTemplateValues,
      }),
      !options.type
        ? forEach((file) => {
            let filePath: string = file.path;
            while (filePath.includes('..')) {
              filePath = filePath.replaceAll('..', '.');
            }

            return {
              content: file.content,
              path: filePath,
            } as ReturnType<FileOperator>;
          })
        : noop(),
      move(parsedPath.path + (options.flat ? '' : '/' + strings.dasherize(options.name))),
    ]);

    return chain([mergeWith(templateSource)]);
  };
}
