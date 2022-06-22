/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

/** Build the Angular universal release packages/ */
export declare function buildTargetPackages(
  destDir,
  description,
  isRelease = false,
): { name: string; outputPath: string }[];
