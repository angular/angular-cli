/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
export const AngularPluginSymbol = Symbol.for('@angular-devkit/build-angular[angular-compiler]');

export interface EmitFileResult {
  content?: string;
  map?: string;
  dependencies: readonly string[];
  hash?: Uint8Array;
}

export type FileEmitter = (file: string) => Promise<EmitFileResult | undefined>;
