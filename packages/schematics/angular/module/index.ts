/**
* @license
* Copyright Google Inc. All Rights Reserved.
*
* Use of this source code is governed by an MIT-style license that can be
* found in the LICENSE file at https://angular.io/license
*/
// TODO: replace `options: any` with an actual type generated from the schema.
// tslint:disable:no-any
import {
  Rule,
  apply,
  branchAndMerge,
  chain,
  filter,
  mergeWith,
  move,
  noop,
  template,
  url,
} from '@angular-devkit/schematics';
import * as stringUtils from '../strings';


export default function (options: any): Rule {
  const templateSource = apply(url('./files'), [
    options.spec ? noop() : filter(path => !path.endsWith('.spec.ts')),
    options.routing ? noop() : filter(path => !path.endsWith('-routing.module.ts')),
    template({
      ...stringUtils,
      'if-flat': (s: string) => options.flat ? '' : s,
      ...options,
    }),
    move(options.sourceDir),
  ]);

  return chain([
    branchAndMerge(chain([
      mergeWith(templateSource),
    ])),
  ]);
}
