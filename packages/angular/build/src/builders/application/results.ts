/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { BuildOutputFileType } from '../../tools/esbuild/bundler-context';

export enum ResultKind {
  Failure,
  Full,
  Incremental,
  ComponentUpdate,
}

export type Result = FailureResult | FullResult | IncrementalResult | ComponentUpdateResult;

export interface BaseResult {
  kind: ResultKind;
  warnings?: ResultMessage[];
  duration?: number;
  detail?: Record<string, unknown>;
}

export interface FailureResult extends BaseResult {
  kind: ResultKind.Failure;
  errors: ResultMessage[];
}

export interface FullResult extends BaseResult {
  kind: ResultKind.Full;
  files: Record<string, ResultFile>;
}

export interface IncrementalResult extends BaseResult {
  kind: ResultKind.Incremental;
  background?: boolean;
  added: string[];
  removed: { path: string; type: BuildOutputFileType }[];
  modified: string[];
  files: Record<string, ResultFile>;
}

export type ResultFile = DiskFile | MemoryFile;

export interface BaseResultFile {
  origin: 'memory' | 'disk';
  type: BuildOutputFileType;
}

export interface DiskFile extends BaseResultFile {
  origin: 'disk';
  inputPath: string;
}

export interface MemoryFile extends BaseResultFile {
  origin: 'memory';
  hash: string;
  contents: Uint8Array;
}

export interface ResultMessage {
  text: string;
  location?: { file: string; line: number; column: number } | null;
  notes?: { text: string }[];
}

export interface ComponentUpdateResult extends BaseResult {
  kind: ResultKind.ComponentUpdate;
  updates: {
    id: string;
    type: 'style' | 'template';
    content: string;
  }[];
}
