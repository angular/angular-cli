/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import ts from '../../../third_party/github.com/Microsoft/TypeScript/lib/typescript';
import { RefactorReporter } from './refactor-reporter';

/**
 * A context object that provides access to shared utilities and state
 * throughout the transformation process.
 */
export interface RefactorContext {
  /** The root ts.SourceFile node of the file being transformed. */
  readonly sourceFile: ts.SourceFile;

  /** The reporter for logging changes and TODOs. */
  readonly reporter: RefactorReporter;

  /** The official context from the TypeScript Transformer API. */
  readonly tsContext: ts.TransformationContext;

  /** A set of Vitest value imports to be added to the file. */
  readonly pendingVitestValueImports: Set<string>;

  /** A set of Vitest type imports to be added to the file. */
  readonly pendingVitestTypeImports: Set<string>;
}

/**
 * A generic transformer function that operates on a specific type of ts.Node.
 * @template T The specific type of AST node this transformer works on (e.g., ts.CallExpression).
 */
export type NodeTransformer<T extends ts.Node> = (
  node: T,
  refactorCtx: RefactorContext,
) => ts.Node | readonly ts.Node[];
