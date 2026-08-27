/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

export {
  AngularCompilation,
  type AngularCompilationOptions,
  type AngularCompilationResult,
  DiagnosticModes,
  type EmitFileResult,
  type FileTransformResult,
} from './angular-compilation';
export { createAngularCompilation, type AngularCompilationMode } from './factory';
export { NoopCompilation } from './noop-compilation';
export { TypeScriptCompilation } from './typescript-compilation';
