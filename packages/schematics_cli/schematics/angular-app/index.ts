/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as stringUtils from '../strings';
import {Rule, mergeWith, apply, move, template, url} from '@angular/schematics';


export default function(options: any): Rule {
  return mergeWith([
    apply(url('./files'), [
      template({ utils: stringUtils, ...options }),
      move(options.sourceDir)
    ])
  ]);
};
