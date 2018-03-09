
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// import { relative, Path } from "../../../angular_devkit/core/src/virtual-fs";
import { Path, basename, normalize, split } from '@angular-devkit/core';

export interface Location {
  name: string;
  path: Path;
}

export function parseName(path: string | Path, name: string): Location {
  const splitName = split(name as Path);
  const nameWithoutPath = basename(name as Path);
  const namePath = splitName.join('/');
  const fullPath = normalize('/' + path + '/' + namePath);

  return {
    name: nameWithoutPath,
    path: fullPath,
  };
}
