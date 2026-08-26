/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type {
  CompileResult,
  FileImporter,
  Importer,
  NodePackageImporter,
  StringOptions,
} from 'sass-embedded';

/**
 * Common interface for Sass service implementations.
 */
export interface SassServiceImplementation {
  readonly info: string;
  compileStringAsync(source: string, options: StringOptions<'async'>): Promise<CompileResult>;
  close(): Promise<void>;
}

/**
 * All available importer types.
 */
export type Importers =
  | Importer<'sync'>
  | Importer<'async'>
  | FileImporter<'sync'>
  | FileImporter<'async'>
  | NodePackageImporter;

export function isFileImporter(value: Importers): value is FileImporter {
  return 'findFileUrl' in value;
}
