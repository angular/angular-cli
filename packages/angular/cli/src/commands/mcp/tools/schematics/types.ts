/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

export interface InferenceResult {
  options: Record<string, unknown>;
  hints: string[];
  missingAfter: string[];
  nameCandidates: string[];
}

export interface SchematicMetaOption {
  name: string;
  description?: string;
  type?: string | string[];
  enum?: unknown[];
  default?: unknown;
  required?: boolean;
  alias?: string;
  oneOf?: unknown[];
  prompt?: string;
}

export interface SchematicMeta {
  name: string;
  aliases?: string[];
  description?: string;
  hidden?: boolean;
  private?: boolean;
  options?: SchematicMetaOption[];
  required?: string[];
}

export interface ResolutionInfo {
  resolved?: string;
  candidateDir: string;
  strategy: string;
  anchor?: string;
  fallback?: boolean;
  error?: string;
}

interface CollectionEntryRaw {
  aliases?: string[];
  description?: string;
  hidden?: boolean;
  private?: boolean;
  schema?: string;
}

export interface CollectionJson {
  schematics: Record<string, CollectionEntryRaw>;
}

export interface SchemaShape {
  properties?: Record<string, unknown>;
  required?: string[];
}
