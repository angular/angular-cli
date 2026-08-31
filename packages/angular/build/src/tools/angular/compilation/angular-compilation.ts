/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { PartialMessage } from 'esbuild';
import type { AngularHostOptions } from '../angular-host';
import type { CompilerOptionOverrides } from './compiler-options';

export interface EmitFileResult {
  filename: string;
  contents: string;
  dependencies?: readonly string[];
}

export interface FileTransformResult {
  contents: string;
  watchFiles?: readonly string[];
}

export interface AngularCompilationOptions {
  allowJs?: boolean;
  isolatedModules?: boolean;
  sourceMap?: boolean;
  inlineSourceMap?: boolean;
  _useTypeScriptTranspilation?: boolean;
  [key: string]: unknown;
}

export interface AngularCompilationResult {
  compilerOptions: AngularCompilationOptions;
  referencedFiles: readonly string[];
  externalStylesheets?: ReadonlyMap<string, string>;
  templateUpdates?: ReadonlyMap<string, string>;
  componentResourcesDependencies?: ReadonlyMap<string, readonly string[]>;
  warnings?: readonly PartialMessage[];
}

export enum DiagnosticModes {
  None = 0,
  Option = 1 << 0,
  Syntactic = 1 << 1,
  Semantic = 1 << 2,
  All = Option | Syntactic | Semantic,
}

export abstract class AngularCompilation {
  abstract initialize(
    tsconfig: string,
    hostOptions: AngularHostOptions,
    compilerOptionOverrides?: CompilerOptionOverrides,
  ): Promise<AngularCompilationResult>;

  emitAffectedFiles(): Iterable<EmitFileResult> | Promise<Iterable<EmitFileResult>> {
    return [];
  }

  transformFile?(filename: string, content: string): Promise<FileTransformResult | null>;

  async diagnoseFiles(
    modes?: DiagnosticModes,
  ): Promise<{ errors?: PartialMessage[]; warnings?: PartialMessage[] }> {
    return {};
  }

  update?(files: Set<string>): Promise<void>;

  close?(): Promise<void>;
}
