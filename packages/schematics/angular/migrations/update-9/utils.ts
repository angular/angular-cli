/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { JsonParseMode, dirname, normalize, parseJsonAst, resolve } from '@angular-devkit/core';
import { Tree } from '@angular-devkit/schematics';
import { findPropertyInAstObject } from '../../utility/json-utils';

export function isIvyEnabled(tree: Tree, tsConfigPath: string): boolean {
  // In version 9, Ivy is turned on by default
  // Ivy is opted out only when 'enableIvy' is set to false.

  const buffer = tree.read(tsConfigPath);
  if (!buffer) {
    return true;
  }

  const tsCfgAst = parseJsonAst(buffer.toString(), JsonParseMode.Loose);

  if (tsCfgAst.kind !== 'object') {
    return true;
  }

  const ngCompilerOptions = findPropertyInAstObject(tsCfgAst, 'angularCompilerOptions');
  if (ngCompilerOptions && ngCompilerOptions.kind === 'object') {
    const enableIvy = findPropertyInAstObject(ngCompilerOptions, 'enableIvy');

    if (enableIvy) {
      return !!enableIvy.value;
    }
  }

  const configExtends = findPropertyInAstObject(tsCfgAst, 'extends');
  if (configExtends && configExtends.kind === 'string') {
    const extendedTsConfigPath = resolve(
      dirname(normalize(tsConfigPath)),
      normalize(configExtends.value),
    );

    return isIvyEnabled(tree, extendedTsConfigPath);
  }

  return true;
}

// TS represents paths internally with '/' and expects paths to be in this format.
// angular.json expects paths with '/', but doesn't enforce them.
export function forwardSlashPath(path: string) {
  return path.replace(/\\/g, '/');
}
