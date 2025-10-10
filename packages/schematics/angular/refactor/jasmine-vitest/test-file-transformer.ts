/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import ts from '../../third_party/github.com/Microsoft/TypeScript/lib/typescript';
import {
  transformDoneCallback,
  transformFocusedAndSkippedTests,
  transformPending,
} from './transformers/jasmine-lifecycle';
import {
  transformArrayWithExactContents,
  transformAsymmetricMatchers,
  transformCalledOnceWith,
  transformComplexMatchers,
  transformExpectAsync,
  transformExpectNothing,
  transformSyntacticSugarMatchers,
  transformToHaveClass,
  transformWithContext,
  transformtoHaveBeenCalledBefore,
} from './transformers/jasmine-matcher';
import {
  transformCreateSpyObj,
  transformSpies,
  transformSpyCallInspection,
  transformSpyReset,
} from './transformers/jasmine-spy';
import { RefactorContext } from './utils/refactor-context';
import { RefactorReporter } from './utils/refactor-reporter';

/**
 * Transforms a string of Jasmine test code to Vitest test code.
 * This is the main entry point for the transformation.
 * @param content The source code to transform.
 * @param reporter The reporter to track TODOs.
 * @returns The transformed code.
 */
export function transformJasmineToVitest(
  filePath: string,
  content: string,
  reporter: RefactorReporter,
): string {
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  const transformer: ts.TransformerFactory<ts.SourceFile> = (context) => {
    const refactorCtx: RefactorContext = {
      sourceFile,
      reporter,
      tsContext: context,
    };

    const visitor: ts.Visitor = (node) => {
      let transformedNode: ts.Node | readonly ts.Node[] = node;

      // Transform the node itself based on its type
      if (ts.isCallExpression(transformedNode)) {
        const transformations = [
          transformWithContext,
          transformExpectAsync,
          transformSyntacticSugarMatchers,
          transformFocusedAndSkippedTests,
          transformComplexMatchers,
          transformSpies,
          transformCreateSpyObj,
          transformSpyReset,
          transformFocusedAndSkippedTests,
          transformSpyCallInspection,
          transformPending,
          transformDoneCallback,
          transformtoHaveBeenCalledBefore,
          transformToHaveClass,
        ];

        for (const transformer of transformations) {
          transformedNode = transformer(transformedNode, refactorCtx);
        }
      } else if (ts.isPropertyAccessExpression(transformedNode)) {
        const transformations = [transformAsymmetricMatchers, transformSpyCallInspection];
        for (const transformer of transformations) {
          transformedNode = transformer(transformedNode, refactorCtx);
        }
      } else if (ts.isExpressionStatement(transformedNode)) {
        const statementTransformers = [
          transformCalledOnceWith,
          transformArrayWithExactContents,
          transformExpectNothing,
        ];

        for (const transformer of statementTransformers) {
          const result = transformer(transformedNode, refactorCtx);
          if (result !== transformedNode) {
            transformedNode = result;
            break;
          }
        }
      }

      // Visit the children of the node to ensure they are transformed
      if (Array.isArray(transformedNode)) {
        return transformedNode.map((node) => ts.visitEachChild(node, visitor, context));
      } else {
        return ts.visitEachChild(transformedNode as ts.Node, visitor, context);
      }
    };

    return (node) => ts.visitNode(node, visitor) as ts.SourceFile;
  };

  const result = ts.transform(sourceFile, [transformer]);
  if (result.transformed[0] === sourceFile && !reporter.hasTodos) {
    return content;
  }

  const printer = ts.createPrinter();

  return printer.printFile(result.transformed[0]);
}
