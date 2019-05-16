/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as browserslist from 'browserslist';
import * as caniuse from 'caniuse-api';
import { ScriptTarget } from 'typescript';


export function isDifferentialLoadingNeeded(
  projectRoot: string,
  target: ScriptTarget = ScriptTarget.ES5): boolean {

  const supportES2015 = target !== ScriptTarget.ES3 && target !== ScriptTarget.ES5;

  return supportES2015 && isEs5SupportNeeded(projectRoot);
}

export function isEs5SupportNeeded(projectRoot: string): boolean {
  const browsersList: string[] = browserslist(
    undefined, {
      path: projectRoot,
    });

  return !caniuse.isSupported('es6-module', browsersList.join(', '));
}
