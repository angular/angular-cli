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
  transformDefaultTimeoutInterval,
  transformFail,
  transformGlobalFunctions,
  transformTimerMocks,
  transformUnknownJasmineProperties,
  transformUnsupportedJasmineCalls,
} from './transformers/jasmine-misc';
import {
  transformCreateSpyObj,
  transformSpies,
  transformSpyCallInspection,
  transformSpyReset,
} from './transformers/jasmine-spy';
import { transformJasmineTypes } from './transformers/jasmine-type';
import { getVitestAutoImports } from './utils/ast-helpers';
import { RefactorContext } from './utils/refactor-context';
import { RefactorReporter } from './utils/refactor-reporter';

const BLANK_LINE_PLACEHOLDER = '// __PRESERVE_BLANK_LINE__';

function preserveBlankLines(content: string): string {
  return content
    .split('\n')
    .map((line) => (line.trim() === '' ? BLANK_LINE_PLACEHOLDER : line))
    .join('\n');
}

function restoreBlankLines(content: string): string {
  const regex = new RegExp(`^\\s*${BLANK_LINE_PLACEHOLDER.replace(/\//g, '\\/')}\\s*$`, 'gm');

  return content.replace(regex, '');
}

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
  const contentWithPlaceholders = preserveBlankLines(content);

  const sourceFile = ts.createSourceFile(
    filePath,
    contentWithPlaceholders,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  const pendingVitestImports = new Set<string>();
  const transformer: ts.TransformerFactory<ts.SourceFile> = (context) => {
    const refactorCtx: RefactorContext = {
      sourceFile,
      reporter,
      tsContext: context,
      pendingVitestImports,
    };

    const visitor: ts.Visitor = (node) => {
      let transformedNode: ts.Node | readonly ts.Node[] = node;

      // Transform the node itself based on its type
      if (ts.isCallExpression(transformedNode)) {
        const transformations = [
          // **Stage 1: High-Level & Context-Sensitive Transformations**
          // These transformers often wrap or fundamentally change the nature of the call,
          // so they need to run before more specific matchers.
          transformWithContext,
          transformExpectAsync,
          transformFocusedAndSkippedTests,
          transformPending,
          transformDoneCallback,

          // **Stage 2: Core Matcher & Spy Transformations**
          // This is the bulk of the `expect(...)` and `spyOn(...)` conversions.
          transformSyntacticSugarMatchers,
          transformComplexMatchers,
          transformSpies,
          transformCreateSpyObj,
          transformSpyReset,
          transformSpyCallInspection,
          transformtoHaveBeenCalledBefore,
          transformToHaveClass,

          // **Stage 3: Global Functions & Cleanup**
          // These handle global Jasmine functions and catch-alls for unsupported APIs.
          transformTimerMocks,
          transformGlobalFunctions,
          transformUnsupportedJasmineCalls,
        ];

        for (const transformer of transformations) {
          transformedNode = transformer(transformedNode, refactorCtx);
        }
      } else if (ts.isPropertyAccessExpression(transformedNode)) {
        const transformations = [
          // These transformers handle `jasmine.any()` and other `jasmine.*` properties.
          transformAsymmetricMatchers,
          transformSpyCallInspection,
          transformUnknownJasmineProperties,
        ];
        for (const transformer of transformations) {
          transformedNode = transformer(transformedNode, refactorCtx);
        }
      } else if (ts.isExpressionStatement(transformedNode)) {
        // Statement-level transformers are mutually exclusive. The first one that
        // matches will be applied, and then the visitor will stop for this node.
        const statementTransformers = [
          transformCalledOnceWith,
          transformArrayWithExactContents,
          transformExpectNothing,
          transformFail,
          transformDefaultTimeoutInterval,
        ];

        for (const transformer of statementTransformers) {
          const result = transformer(transformedNode, refactorCtx);
          if (result !== transformedNode) {
            transformedNode = result;
            break;
          }
        }
      } else if (ts.isQualifiedName(transformedNode) || ts.isTypeReferenceNode(transformedNode)) {
        transformedNode = transformJasmineTypes(transformedNode, refactorCtx);
      }

      // Visit the children of the node to ensure they are transformed
      if (Array.isArray(transformedNode)) {
        return transformedNode.map((node) => ts.visitEachChild(node, visitor, context));
      } else {
        return ts.visitEachChild(transformedNode as ts.Node, visitor, context);
      }
    };

    return (node) => ts.visitEachChild(node, visitor, context);
  };

  const result = ts.transform(sourceFile, [transformer]);
  let transformedSourceFile = result.transformed[0];

  if (transformedSourceFile === sourceFile && !reporter.hasTodos && !pendingVitestImports.size) {
    return content;
  }

  const vitestImport = getVitestAutoImports(pendingVitestImports);
  if (vitestImport) {
    transformedSourceFile = ts.factory.updateSourceFile(transformedSourceFile, [
      vitestImport,
      ...transformedSourceFile.statements,
    ]);
  }

  const printer = ts.createPrinter();
  const transformedContentWithPlaceholders = printer.printFile(transformedSourceFile);

  return restoreBlankLines(transformedContentWithPlaceholders);
}
