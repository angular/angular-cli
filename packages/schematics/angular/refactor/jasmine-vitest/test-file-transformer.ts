/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/**
 * @fileoverview This is the main entry point for the Jasmine to Vitest transformation.
 * It orchestrates the application of various AST transformers to convert Jasmine test
 * syntax and APIs to their Vitest equivalents. It also handles import management,
 * blank line preservation, and reporting of transformation details.
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
import { addVitestValueImport, getVitestAutoImports } from './utils/ast-helpers';
import { RefactorContext } from './utils/refactor-context';
import { RefactorReporter } from './utils/refactor-reporter';

/**
 * A placeholder used to temporarily replace blank lines in the source code.
 * This is necessary because TypeScript's printer removes blank lines by default.
 */
const BLANK_LINE_PLACEHOLDER = '// __PRESERVE_BLANK_LINE__';

/**
 * Vitest function names that should be imported when using the --add-imports option.
 */
const VITEST_FUNCTION_NAMES = new Set([
  'describe',
  'it',
  'expect',
  'beforeEach',
  'afterEach',
  'beforeAll',
  'afterAll',
]);

/**
 * Replaces blank lines in the content with a placeholder to prevent TypeScript's printer
 * from removing them. This ensures that the original formatting of blank lines is preserved.
 * @param content The source code content.
 * @returns The content with blank lines replaced by placeholders.
 */
function preserveBlankLines(content: string): string {
  return content
    .split('\n')
    .map((line) => (line.trim() === '' ? BLANK_LINE_PLACEHOLDER : line))
    .join('\n');
}

/**
 * Restores blank lines in the content by replacing the placeholder with actual blank lines.
 * This is called after TypeScript's printer has processed the file.
 * @param content The content with blank line placeholders.
 * @returns The content with blank lines restored.
 */
function restoreBlankLines(content: string): string {
  const regex = /^\s*\/\/ __PRESERVE_BLANK_LINE__\s*$/gm;

  return content.replace(regex, '');
}

/**
 * A collection of transformers that operate on `ts.CallExpression` nodes.
 * These are applied in stages to ensure correct order of operations:
 * 1. High-Level & Context-Sensitive: Transformations that fundamentally change the call.
 * 2. Core Matcher & Spy: Bulk conversions for `expect(...)` and `spyOn(...)`.
 * 3. Global Functions & Cleanup: Handles global Jasmine functions and unsupported APIs.
 */
const callExpressionTransformers = [
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

/**
 * A collection of transformers that operate on `ts.PropertyAccessExpression` nodes.
 * These primarily handle `jasmine.any()` and other `jasmine.*` properties.
 */
const propertyAccessExpressionTransformers = [
  // These transformers handle `jasmine.any()` and other `jasmine.*` properties.
  transformAsymmetricMatchers,
  transformSpyCallInspection,
  transformUnknownJasmineProperties,
];

/**
 * A collection of transformers that operate on `ts.ExpressionStatement` nodes.
 * These are mutually exclusive; the first one that matches will be applied.
 */
const expressionStatementTransformers = [
  transformCalledOnceWith,
  transformArrayWithExactContents,
  transformExpectNothing,
  transformFail,
  transformDefaultTimeoutInterval,
];

/**
 * Transforms a string of Jasmine test code to Vitest test code.
 * This is the main entry point for the transformation.
 * @param filePath The path to the file being transformed.
 * @param content The source code to transform.
 * @param reporter The reporter to track TODOs.
 * @param options Transformation options, including whether to add Vitest API imports.
 * @returns The transformed code.
 */
export function transformJasmineToVitest(
  filePath: string,
  content: string,
  reporter: RefactorReporter,
  options: { addImports: boolean; browserMode: boolean },
): string {
  const contentWithPlaceholders = preserveBlankLines(content);

  const sourceFile = ts.createSourceFile(
    filePath,
    contentWithPlaceholders,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  const pendingVitestValueImports = new Set<string>();
  const pendingVitestTypeImports = new Set<string>();

  const transformer: ts.TransformerFactory<ts.SourceFile> = (context) => {
    const refactorCtx: RefactorContext = {
      sourceFile,
      reporter,
      tsContext: context,
      pendingVitestValueImports,
      pendingVitestTypeImports,
    };

    const visitor: ts.Visitor = (node) => {
      let transformedNode: ts.Node | readonly ts.Node[] = node;

      // Transform the node itself based on its type
      if (ts.isCallExpression(transformedNode)) {
        if (options.addImports && ts.isIdentifier(transformedNode.expression)) {
          const name = transformedNode.expression.text;
          if (VITEST_FUNCTION_NAMES.has(name)) {
            addVitestValueImport(pendingVitestValueImports, name);
          }
        }

        for (const transformer of callExpressionTransformers) {
          if (!(options.browserMode && transformer === transformToHaveClass)) {
            transformedNode = transformer(transformedNode, refactorCtx);
          }
        }
      } else if (ts.isPropertyAccessExpression(transformedNode)) {
        for (const transformer of propertyAccessExpressionTransformers) {
          transformedNode = transformer(transformedNode, refactorCtx);
        }
      } else if (ts.isExpressionStatement(transformedNode)) {
        // Statement-level transformers are mutually exclusive. The first one that
        // matches will be applied, and then the visitor will stop for this node.
        for (const transformer of expressionStatementTransformers) {
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

  const hasPendingValueImports = pendingVitestValueImports.size > 0;
  const hasPendingTypeImports = pendingVitestTypeImports.size > 0;

  if (
    transformedSourceFile === sourceFile &&
    !reporter.hasTodos &&
    !hasPendingValueImports &&
    !hasPendingTypeImports
  ) {
    return content;
  }

  if (hasPendingTypeImports || (options.addImports && hasPendingValueImports)) {
    const vitestImport = getVitestAutoImports(
      options.addImports ? pendingVitestValueImports : new Set(),
      pendingVitestTypeImports,
    );
    if (vitestImport) {
      transformedSourceFile = ts.factory.updateSourceFile(transformedSourceFile, [
        vitestImport,
        ...transformedSourceFile.statements,
      ]);
    }
  }

  const printer = ts.createPrinter();
  const transformedContentWithPlaceholders = printer.printFile(transformedSourceFile);

  return restoreBlankLines(transformedContentWithPlaceholders);
}
