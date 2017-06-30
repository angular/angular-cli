/**
* @license
* Copyright Google Inc. All Rights Reserved.
*
* Use of this source code is governed by an MIT-style license that can be
* found in the LICENSE file at https://angular.io/license
*/

import {
  Rule,
  apply,
  branchAndMerge,
  chain,
  mergeWith,
  move,
  template,
  url
} from '@angular-devkit/schematics';
import * as stringUtils from '../strings';


export default function (options: any): Rule {
  const templateSource = apply(url('./files'), [
    template({
      ...stringUtils,
      ...options
    }),
    move(options.sourceDir)
  ]);

  return chain([
    branchAndMerge(chain([
      mergeWith(templateSource)
    ]))
  ]);
}
