/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/**
 * @fileoverview This file contains transformers that convert Jasmine lifecycle functions
 * and test setup/teardown patterns to their Vitest equivalents. This includes handling
 * focused/skipped tests (fdescribe, fit, xdescribe, xit), pending tests, and asynchronous
 * operations that use the `done` callback.
 */

import ts from '../../../third_party/github.com/Microsoft/TypeScript/lib/typescript';
import { createPropertyAccess } from '../utils/ast-helpers';
import { addTodoComment } from '../utils/comment-helpers';
import { RefactorContext } from '../utils/refactor-context';

const FOCUSED_SKIPPED_RENAMES = new Map<string, { newBase: string; newName: string }>([
  ['fdescribe', { newBase: 'describe', newName: 'only' }],
  ['fit', { newBase: 'it', newName: 'only' }],
  ['xdescribe', { newBase: 'describe', newName: 'skip' }],
  ['xit', { newBase: 'it', newName: 'skip' }],
]);

export function transformFocusedAndSkippedTests(
  node: ts.Node,
  { sourceFile, reporter }: RefactorContext,
): ts.Node {
  if (!ts.isCallExpression(node) || !ts.isIdentifier(node.expression)) {
    return node;
  }

  const oldName = node.expression.text;
  const rename = FOCUSED_SKIPPED_RENAMES.get(oldName);
  if (rename) {
    reporter.reportTransformation(
      sourceFile,
      node,
      `Transformed \`${oldName}\` to \`${rename.newBase}.${rename.newName}\`.`,
    );

    const newPropAccess = createPropertyAccess(rename.newBase, rename.newName);

    return ts.factory.updateCallExpression(node, newPropAccess, node.typeArguments, node.arguments);
  }

  return node;
}

export function transformPending(
  node: ts.Node,
  { sourceFile, reporter, tsContext }: RefactorContext,
): ts.Node {
  if (
    !ts.isCallExpression(node) ||
    !ts.isIdentifier(node.expression) ||
    node.expression.text !== 'it'
  ) {
    return node;
  }

  const testFn = node.arguments[1];
  if (!testFn || (!ts.isArrowFunction(testFn) && !ts.isFunctionExpression(testFn))) {
    return node;
  }

  let hasPending = false;
  const bodyTransformVisitor = (bodyNode: ts.Node): ts.Node | undefined => {
    if (
      ts.isExpressionStatement(bodyNode) &&
      ts.isCallExpression(bodyNode.expression) &&
      ts.isIdentifier(bodyNode.expression.expression) &&
      bodyNode.expression.expression.text === 'pending'
    ) {
      hasPending = true;
      const replacement = ts.factory.createEmptyStatement();
      const originalText = bodyNode.getFullText().trim();

      reporter.reportTransformation(
        sourceFile,
        bodyNode,
        'Converted `pending()` to a skipped test (`it.skip`).',
      );
      const category = 'pending';
      reporter.recordTodo(category);
      addTodoComment(replacement, category);
      ts.addSyntheticLeadingComment(
        replacement,
        ts.SyntaxKind.SingleLineCommentTrivia,
        ` ${originalText}`,
        true,
      );

      return replacement;
    }

    return ts.visitEachChild(bodyNode, bodyTransformVisitor, tsContext);
  };

  const newBody = ts.visitNode(testFn.body, bodyTransformVisitor) as ts.ConciseBody | undefined;

  if (!hasPending) {
    return node;
  }

  const newExpression = createPropertyAccess(node.expression, 'skip');
  const newTestFn = ts.isArrowFunction(testFn)
    ? ts.factory.updateArrowFunction(
        testFn,
        testFn.modifiers,
        testFn.typeParameters,
        testFn.parameters,
        testFn.type,
        testFn.equalsGreaterThanToken,
        newBody ?? ts.factory.createBlock([]),
      )
    : ts.factory.updateFunctionExpression(
        testFn,
        testFn.modifiers,
        testFn.asteriskToken,
        testFn.name,
        testFn.typeParameters,
        testFn.parameters,
        testFn.type,
        (newBody as ts.Block) ?? ts.factory.createBlock([]),
      );

  const newArgs = [node.arguments[0], newTestFn, ...node.arguments.slice(2)];

  return ts.factory.updateCallExpression(node, newExpression, node.typeArguments, newArgs);
}

function transformComplexDoneCallback(
  node: ts.Node,
  doneIdentifier: ts.Identifier,
  refactorCtx: RefactorContext,
): ts.Node | ts.Node[] | undefined {
  const { sourceFile, reporter } = refactorCtx;
  if (
    !ts.isExpressionStatement(node) ||
    !ts.isCallExpression(node.expression) ||
    !ts.isPropertyAccessExpression(node.expression.expression)
  ) {
    return node;
  }

  const call = node.expression;
  const pae = call.expression;

  if (!ts.isPropertyAccessExpression(pae)) {
    return node;
  }

  if (pae.name.text !== 'then' || call.arguments.length !== 1) {
    return node;
  }

  const thenCallback = call.arguments[0];
  if (!ts.isArrowFunction(thenCallback) && !ts.isFunctionExpression(thenCallback)) {
    return node;
  }

  // Re-create the .then() call but with a modified callback that has `done()` removed.
  const thenCallbackBody = ts.isBlock(thenCallback.body)
    ? thenCallback.body
    : ts.factory.createBlock([ts.factory.createExpressionStatement(thenCallback.body)]);

  const newStatements = thenCallbackBody.statements.filter((stmt) => {
    return (
      !ts.isExpressionStatement(stmt) ||
      !ts.isCallExpression(stmt.expression) ||
      !ts.isIdentifier(stmt.expression.expression) ||
      stmt.expression.expression.text !== doneIdentifier.text
    );
  });

  if (newStatements.length === thenCallbackBody.statements.length) {
    // No "done()" call was removed, so don't transform.
    return node;
  }

  reporter.reportTransformation(
    sourceFile,
    node,
    'Transformed promise `.then()` with `done()` to `await`.',
  );

  const newThenCallback = ts.isArrowFunction(thenCallback)
    ? ts.factory.updateArrowFunction(
        thenCallback,
        thenCallback.modifiers,
        thenCallback.typeParameters,
        thenCallback.parameters,
        thenCallback.type,
        thenCallback.equalsGreaterThanToken,
        ts.factory.updateBlock(thenCallbackBody, newStatements),
      )
    : ts.factory.updateFunctionExpression(
        thenCallback,
        thenCallback.modifiers,
        thenCallback.asteriskToken,
        thenCallback.name,
        thenCallback.typeParameters,
        thenCallback.parameters,
        thenCallback.type,
        ts.factory.updateBlock(thenCallbackBody, newStatements),
      );

  const newCall = ts.factory.updateCallExpression(call, call.expression, call.typeArguments, [
    newThenCallback,
  ]);

  return ts.factory.createExpressionStatement(ts.factory.createAwaitExpression(newCall));
}

function transformPromiseBasedDone(
  callExpr: ts.CallExpression,
  doneIdentifier: ts.Identifier,
  refactorCtx: RefactorContext,
): ts.Node | undefined {
  const { sourceFile, reporter } = refactorCtx;
  if (
    ts.isPropertyAccessExpression(callExpr.expression) &&
    (callExpr.expression.name.text === 'then' || callExpr.expression.name.text === 'catch')
  ) {
    const promiseHandler = callExpr.arguments[0];
    if (promiseHandler) {
      let isDoneHandler = false;
      // promise.then(done)
      if (ts.isIdentifier(promiseHandler) && promiseHandler.text === doneIdentifier.text) {
        isDoneHandler = true;
      }
      // promise.catch(done.fail)
      if (
        ts.isPropertyAccessExpression(promiseHandler) &&
        ts.isIdentifier(promiseHandler.expression) &&
        promiseHandler.expression.text === doneIdentifier.text &&
        promiseHandler.name.text === 'fail'
      ) {
        isDoneHandler = true;
      }
      // promise.then(() => done())
      if (ts.isArrowFunction(promiseHandler) && !promiseHandler.parameters.length) {
        const body = promiseHandler.body;
        if (
          ts.isCallExpression(body) &&
          ts.isIdentifier(body.expression) &&
          body.expression.text === doneIdentifier.text
        ) {
          isDoneHandler = true;
        }
        if (ts.isBlock(body) && body.statements.length === 1) {
          const stmt = body.statements[0];
          if (
            ts.isExpressionStatement(stmt) &&
            ts.isCallExpression(stmt.expression) &&
            ts.isIdentifier(stmt.expression.expression) &&
            stmt.expression.expression.text === doneIdentifier.text
          ) {
            isDoneHandler = true;
          }
        }
      }

      if (isDoneHandler) {
        reporter.reportTransformation(
          sourceFile,
          callExpr,
          'Transformed promise `.then(done)` to `await`.',
        );

        return ts.factory.createExpressionStatement(
          ts.factory.createAwaitExpression(callExpr.expression.expression),
        );
      }
    }
  }

  return undefined;
}

export function transformDoneCallback(node: ts.Node, refactorCtx: RefactorContext): ts.Node {
  const { sourceFile, reporter, tsContext } = refactorCtx;
  if (
    !ts.isCallExpression(node) ||
    !ts.isIdentifier(node.expression) ||
    !['it', 'beforeEach', 'afterEach', 'beforeAll', 'afterAll'].includes(node.expression.text)
  ) {
    return node;
  }

  const functionArg = node.arguments.find(
    (arg) => ts.isArrowFunction(arg) || ts.isFunctionExpression(arg),
  );

  if (!functionArg || (!ts.isArrowFunction(functionArg) && !ts.isFunctionExpression(functionArg))) {
    return node;
  }

  if (functionArg.parameters.length !== 1) {
    return node;
  }

  const doneParam = functionArg.parameters[0];
  if (!ts.isIdentifier(doneParam.name)) {
    return node;
  }
  const doneIdentifier = doneParam.name;
  let doneWasUsed = false;

  const bodyVisitor = (bodyNode: ts.Node): ts.Node | ts.Node[] | undefined => {
    const complexTransformed = transformComplexDoneCallback(bodyNode, doneIdentifier, refactorCtx);
    if (complexTransformed !== bodyNode) {
      doneWasUsed = true;

      return complexTransformed;
    }

    if (ts.isExpressionStatement(bodyNode) && ts.isCallExpression(bodyNode.expression)) {
      const callExpr = bodyNode.expression;

      // Transform `done.fail('message')` to `throw new Error('message')`
      if (
        ts.isPropertyAccessExpression(callExpr.expression) &&
        ts.isIdentifier(callExpr.expression.expression) &&
        callExpr.expression.expression.text === doneIdentifier.text &&
        callExpr.expression.name.text === 'fail'
      ) {
        doneWasUsed = true;
        reporter.reportTransformation(
          sourceFile,
          bodyNode,
          'Transformed `done.fail()` to `throw new Error()`.',
        );
        const errorArgs = callExpr.arguments.length > 0 ? [callExpr.arguments[0]] : [];

        return ts.factory.createThrowStatement(
          ts.factory.createNewExpression(
            ts.factory.createIdentifier('Error'),
            undefined,
            errorArgs,
          ),
        );
      }

      // Transform `promise.then(done)` or `promise.catch(done.fail)` to `await promise`
      const promiseTransformed = transformPromiseBasedDone(callExpr, doneIdentifier, refactorCtx);
      if (promiseTransformed) {
        doneWasUsed = true;

        return promiseTransformed;
      }

      // Remove `done()`
      if (
        ts.isIdentifier(callExpr.expression) &&
        callExpr.expression.text === doneIdentifier.text
      ) {
        doneWasUsed = true;

        return ts.setTextRange(ts.factory.createEmptyStatement(), callExpr.expression);
      }
    }

    return ts.visitEachChild(bodyNode, bodyVisitor, tsContext);
  };

  const newBody = ts.visitNode(functionArg.body, (node: ts.Node) => {
    if (ts.isBlock(node)) {
      const newStatements = node.statements.flatMap(
        (stmt) => bodyVisitor(stmt) as ts.Statement | ts.Statement[] | undefined,
      );

      return ts.factory.updateBlock(
        node,
        newStatements.filter((s) => !!s),
      );
    }

    return bodyVisitor(node);
  });

  if (!doneWasUsed) {
    return node;
  }

  reporter.reportTransformation(
    sourceFile,
    node,
    `Converted test with \`done\` callback to an \`async\` test.`,
  );

  const newModifiers = [
    ts.factory.createModifier(ts.SyntaxKind.AsyncKeyword),
    ...(ts.getModifiers(functionArg) ?? []).filter(
      (mod) => mod.kind !== ts.SyntaxKind.AsyncKeyword,
    ),
  ];

  let newFunction: ts.ArrowFunction | ts.FunctionExpression;
  if (ts.isArrowFunction(functionArg)) {
    newFunction = ts.factory.updateArrowFunction(
      functionArg,
      newModifiers,
      functionArg.typeParameters,
      [], // remove parameters
      functionArg.type,
      functionArg.equalsGreaterThanToken,
      (newBody as ts.ConciseBody) ?? ts.factory.createBlock([]),
    );
  } else {
    // isFunctionExpression
    newFunction = ts.factory.updateFunctionExpression(
      functionArg,
      newModifiers,
      functionArg.asteriskToken,
      functionArg.name,
      functionArg.typeParameters,
      [], // remove parameters
      functionArg.type,
      (newBody as ts.Block) ?? ts.factory.createBlock([]),
    );
  }

  const newArgs = node.arguments.map((arg) => (arg === functionArg ? newFunction : arg));

  return ts.factory.updateCallExpression(node, node.expression, node.typeArguments, newArgs);
}
