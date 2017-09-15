/**
* @license
* Copyright Google Inc. All Rights Reserved.
*
* Use of this source code is governed by an MIT-style license that can be
* found in the LICENSE file at https://angular.io/license
*/
import {
  Rule,
  SchematicsException,
  apply,
  branchAndMerge,
  chain,
  filter,
  mergeWith,
  move,
  noop,
  normalizePath,
  template,
  url,
} from '@angular-devkit/schematics';
import * as stringUtils from '../strings';
import { Schema as ClassOptions } from './schema';


export default function (options: ClassOptions): Rule {
  options.type = !!options.type ? `.${options.type}` : '';
  options.path = options.path ? normalizePath(options.path) : options.path;
  const sourceDir = options.sourceDir;
  if (!sourceDir) {
    throw new SchematicsException(`sourceDir option is required.`);
  }

  const templateSource = apply(url('./files'), [
    options.spec ? noop() : filter(path => !path.endsWith('.spec.ts')),
    template({
      ...stringUtils,
      ...options as object,
    }),
    move(sourceDir),
  ]);

  return chain([
    branchAndMerge(chain([
      mergeWith(templateSource),
    ])),
  ]);
}
