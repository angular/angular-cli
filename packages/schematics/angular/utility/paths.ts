/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { normalize, split } from '@angular-devkit/core';

export function relativePathToWorkspaceRoot(projectRoot: string | undefined): string {
  const normalizedPath = split(normalize(projectRoot || ''));

  if (normalizedPath.length === 0 || !normalizedPath[0]) {
    return '.';
  } else {
    return normalizedPath.map(() => '..').join('/');
  }
}
