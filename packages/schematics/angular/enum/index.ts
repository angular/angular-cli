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
  chain,
  mergeWith,
  move,
  template,
  url,
} from '@angular-devkit/schematics';
import { parseName } from '../utility/parse-name';
import { Schema as EnumOptions } from './schema';


export default function (options: EnumOptions): Rule {
  if (options.path === undefined) {
    // TODO: read this default value from the config file
    options.path = 'src/app';
  }
  const parsedPath = parseName(options.path, options.name);
  options.name = parsedPath.name;

  const templateSource = apply(url('./files'), [
    template({
      ...strings,
      ...options,
    }),
    move(parsedPath.path),
  ]);

  return chain([
    branchAndMerge(chain([
      mergeWith(templateSource),
    ])),
  ]);
}
