/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { normalize } from '@angular-devkit/core';
import { Rule } from '../engine/interface';
import { FilePredicate } from '../tree/interface';
import { forEach } from './base';


export function rename(match: FilePredicate<boolean>, to: FilePredicate<string>): Rule {
  return forEach(entry => {
    if (match(entry.path, entry)) {
      return {
        content: entry.content,
        path: normalize(to(entry.path, entry)),
      };
    } else {
      return entry;
    }
  });
}
