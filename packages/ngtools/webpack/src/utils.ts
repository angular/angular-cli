/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Path, getSystemPath, normalize } from '@angular-devkit/core';

// `TsCompilerAotCompilerTypeCheckHostAdapter` in @angular/compiler-cli seems to resolve module
// names directly via `resolveModuleName`, which prevents full Path usage.
// NSTSC also uses Node.JS `path.resolve` which will result in incorrect paths in Windows
// Example: `/D/MyPath/MyProject` -> `D:/d/mypath/myproject`
// To work around this we must provide the same path format as TS internally uses in
// the SourceFile paths.
export function workaroundResolve(path: Path | string): string {
  return forwardSlashPath(getSystemPath(normalize(path)));
}

export function flattenArray<T>(value: Array<T | T[]>): T[] {
  return ([] as T[]).concat.apply([], value);
}

// TS represents paths internally with '/' and expects paths to be in this format.
export function forwardSlashPath(path: string): string {
  return path.replace(/\\/g, '/');
}
