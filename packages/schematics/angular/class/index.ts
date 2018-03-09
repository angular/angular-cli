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
  apply,
  branchAndMerge,
  filter,
  mergeWith,
  move,
  noop,
  template,
  url,
} from '@angular-devkit/schematics';
import { parseName } from '../utility/parse-name';
import { Schema as ClassOptions } from './schema';


export default function (options: ClassOptions): Rule {
  options.type = !!options.type ? `.${options.type}` : '';

  if (options.path === undefined) {
    // TODO: read this default value from the config file
    options.path = 'src/app';
  }
  const parsedPath = parseName(options.path, options.name);
  options.name = parsedPath.name;

  const templateSource = apply(url('./files'), [
    options.spec ? noop() : filter(path => !path.endsWith('.spec.ts')),
    template({
      ...strings,
      ...options,
    }),
    move(parsedPath.path),
  ]);

  return branchAndMerge(mergeWith(templateSource));
}
