/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/**
 * @fileoverview This file contains transformers dedicated to converting Jasmine's spying
 * functionality to Vitest's mocking APIs. It handles the creation of spies (`spyOn`,
 * `createSpy`, `createSpyObj`), spy strategies (`and.returnValue`, `and.callFake`),
 * and the inspection of spy calls (`spy.calls.reset`, `spy.calls.mostRecent`).
 */

import ts from '../../../third_party/github.com/Microsoft/TypeScript/lib/typescript';
import { createPropertyAccess, createViCallExpression } from '../utils/ast-helpers';
import { getJasmineMethodName, isJasmineCallExpression } from '../utils/ast-validation';
import { addTodoComment } from '../utils/comment-helpers';
import { RefactorContext } from '../utils/refactor-context';

export function transformSpies(node: ts.Node, refactorCtx: RefactorContext): ts.Node {
  const { sourceFile, reporter } = refactorCtx;
  if (!ts.isCallExpression(node)) {
    return node;
  }

  if (
    ts.isIdentifier(node.expression) &&
    (node.expression.text === 'spyOn' || node.expression.text === 'spyOnProperty')
  ) {
    reporter.reportTransformation(
      sourceFile,
      node,
      `Transformed \`${node.expression.text}\` to \`vi.spyOn\`.`,
    );

    return ts.factory.updateCallExpression(
      node,
      createPropertyAccess('vi', 'spyOn'),
      node.typeArguments,
      node.arguments,
    );
  }

  if (ts.isPropertyAccessExpression(node.expression)) {
    const pae = node.expression;

    if (
      ts.isPropertyAccessExpression(pae.expression) &&
      ts.isIdentifier(pae.expression.name) &&
      pae.expression.name.text === 'and'
    ) {
      const spyCall = pae.expression.expression;
      let newMethodName: string | undefined;
      if (ts.isIdentifier(pae.name)) {
        const strategyName = pae.name.text;
        switch (strategyName) {
          case 'returnValue':
            newMethodName = 'mockReturnValue';
            break;
          case 'resolveTo':
            newMethodName = 'mockResolvedValue';
            break;
          case 'rejectWith':
            newMethodName = 'mockRejectedValue';
            break;
          case 'returnValues': {
            reporter.reportTransformation(
              sourceFile,
              node,
              'Transformed `.and.returnValues()` to chained `.mockReturnValueOnce()` calls.',
            );
            const returnValues = node.arguments;
            if (returnValues.length === 0) {
              // No values, so it's a no-op. Just transform the spyOn call.
              return transformSpies(spyCall, refactorCtx);
            }
            // spy.and.returnValues(a, b) -> spy.mockReturnValueOnce(a).mockReturnValueOnce(b)
            let chainedCall: ts.Expression = spyCall;
            for (const value of returnValues) {
              const mockCall = ts.factory.createCallExpression(
                createPropertyAccess(chainedCall, 'mockReturnValueOnce'),
                undefined,
                [value],
              );
              chainedCall = mockCall;
            }

            return chainedCall;
          }
          case 'callFake':
            newMethodName = 'mockImplementation';
            break;
          case 'callThrough':
            reporter.reportTransformation(
              sourceFile,
              node,
              'Removed redundant `.and.callThrough()` call.',
            );

            return transformSpies(spyCall, refactorCtx); // .and.callThrough() is redundant, just transform spyOn.
          case 'stub': {
            reporter.reportTransformation(
              sourceFile,
              node,
              'Transformed `.and.stub()` to `.mockImplementation()`.',
            );
            const newExpression = createPropertyAccess(spyCall, 'mockImplementation');
            const arrowFn = ts.factory.createArrowFunction(
              undefined,
              undefined,
              [],
              undefined,
              ts.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
              ts.factory.createBlock([], /* multiline */ true),
            );

            return ts.factory.createCallExpression(newExpression, undefined, [arrowFn]);
          }
          case 'throwError': {
            reporter.reportTransformation(
              sourceFile,
              node,
              'Transformed `.and.throwError()` to `.mockImplementation()`.',
            );
            const errorArg = node.arguments[0];
            const throwStatement = ts.factory.createThrowStatement(
              ts.isNewExpression(errorArg)
                ? errorArg
                : ts.factory.createNewExpression(
                    ts.factory.createIdentifier('Error'),
                    undefined,
                    node.arguments,
                  ),
            );
            const arrowFunction = ts.factory.createArrowFunction(
              undefined,
              undefined,
              [],
              undefined,
              ts.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
              ts.factory.createBlock([throwStatement], true),
            );
            const newExpression = createPropertyAccess(spyCall, 'mockImplementation');

            return ts.factory.createCallExpression(newExpression, undefined, [arrowFunction]);
          }
          default: {
            const category = 'unsupported-spy-strategy';
            reporter.recordTodo(category);
            addTodoComment(node, category, { name: strategyName });
            break;
          }
        }

        if (newMethodName) {
          reporter.reportTransformation(
            sourceFile,
            node,
            `Transformed spy strategy \`.and.${strategyName}()\` to \`.${newMethodName}()\`.`,
          );

          const newExpression = ts.factory.updatePropertyAccessExpression(
            pae,
            spyCall,
            ts.factory.createIdentifier(newMethodName),
          );

          return ts.factory.updateCallExpression(
            node,
            newExpression,
            node.typeArguments,
            node.arguments,
          );
        }
      }
    }
  }

  const jasmineMethodName = getJasmineMethodName(node);
  switch (jasmineMethodName) {
    case 'createSpy':
      reporter.reportTransformation(
        sourceFile,
        node,
        'Transformed `jasmine.createSpy()` to `vi.fn()`.',
      );

      // jasmine.createSpy(name, originalFn) -> vi.fn(originalFn)
      return createViCallExpression('fn', node.arguments.length > 1 ? [node.arguments[1]] : []);
    case 'spyOnAllFunctions': {
      reporter.reportTransformation(
        sourceFile,
        node,
        'Found unsupported `jasmine.spyOnAllFunctions()`.',
      );
      const category = 'spyOnAllFunctions';
      reporter.recordTodo(category);
      addTodoComment(node, category);

      return node;
    }
  }

  return node;
}

export function transformCreateSpyObj(
  node: ts.Node,
  { sourceFile, reporter }: RefactorContext,
): ts.Node {
  if (!isJasmineCallExpression(node, 'createSpyObj')) {
    return node;
  }

  reporter.reportTransformation(
    sourceFile,
    node,
    'Transformed `jasmine.createSpyObj()` to an object literal with `vi.fn()`.',
  );

  if (node.arguments.length < 2) {
    const category = 'createSpyObj-single-argument';
    reporter.recordTodo(category);
    addTodoComment(node, category);

    return node;
  }

  const methods = node.arguments[1];
  const propertiesArg = node.arguments[2];
  let properties: ts.PropertyAssignment[] = [];

  if (ts.isArrayLiteralExpression(methods)) {
    properties = createSpyObjWithArray(methods);
  } else if (ts.isObjectLiteralExpression(methods)) {
    properties = createSpyObjWithObject(methods);
  } else {
    const category = 'createSpyObj-dynamic-variable';
    reporter.recordTodo(category);
    addTodoComment(node, category);

    return node;
  }

  if (propertiesArg) {
    if (ts.isObjectLiteralExpression(propertiesArg)) {
      properties.push(...(propertiesArg.properties as unknown as ts.PropertyAssignment[]));
    } else {
      const category = 'createSpyObj-dynamic-property-map';
      reporter.recordTodo(category);
      addTodoComment(node, category);
    }
  }

  return ts.factory.createObjectLiteralExpression(properties, true);
}

function createSpyObjWithArray(methods: ts.ArrayLiteralExpression): ts.PropertyAssignment[] {
  return methods.elements
    .map((element) => {
      if (ts.isStringLiteral(element)) {
        return ts.factory.createPropertyAssignment(
          ts.factory.createIdentifier(element.text),
          createViCallExpression('fn'),
        );
      }

      return undefined;
    })
    .filter((p): p is ts.PropertyAssignment => !!p);
}

function createSpyObjWithObject(methods: ts.ObjectLiteralExpression): ts.PropertyAssignment[] {
  return methods.properties
    .map((prop) => {
      if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
        const methodName = prop.name.text;
        const returnValue = prop.initializer;
        const mockFn = createViCallExpression('fn');
        const mockReturnValue = createPropertyAccess(mockFn, 'mockReturnValue');

        return ts.factory.createPropertyAssignment(
          ts.factory.createIdentifier(methodName),
          ts.factory.createCallExpression(mockReturnValue, undefined, [returnValue]),
        );
      }

      return undefined;
    })
    .filter((p): p is ts.PropertyAssignment => !!p);
}

export function transformSpyReset(
  node: ts.Node,
  { sourceFile, reporter }: RefactorContext,
): ts.Node {
  if (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    ts.isIdentifier(node.expression.name) &&
    node.expression.name.text === 'reset' &&
    ts.isPropertyAccessExpression(node.expression.expression)
  ) {
    const callsPae = node.expression.expression;
    if (ts.isIdentifier(callsPae.name) && callsPae.name.text === 'calls') {
      reporter.reportTransformation(
        sourceFile,
        node,
        'Transformed `spy.calls.reset()` to `.mockClear()`.',
      );
      const spyIdentifier = callsPae.expression;
      const newExpression = createPropertyAccess(spyIdentifier, 'mockClear');

      return ts.factory.updateCallExpression(node, newExpression, node.typeArguments, []);
    }
  }

  return node;
}

function getSpyIdentifierFromCalls(node: ts.PropertyAccessExpression): ts.Expression | undefined {
  if (ts.isIdentifier(node.name) && node.name.text === 'calls') {
    return node.expression;
  }

  return undefined;
}

function createMockedSpyMockProperty(spyIdentifier: ts.Expression): ts.PropertyAccessExpression {
  const mockedSpy = ts.factory.createCallExpression(
    createPropertyAccess('vi', 'mocked'),
    undefined,
    [spyIdentifier],
  );

  return createPropertyAccess(mockedSpy, 'mock');
}

export function transformSpyCallInspection(
  node: ts.Node,
  { sourceFile, reporter }: RefactorContext,
): ts.Node {
  // mySpy.calls.mostRecent().args -> vi.mocked(mySpy).mock.lastCall
  if (
    ts.isPropertyAccessExpression(node) &&
    ts.isIdentifier(node.name) &&
    node.name.text === 'args'
  ) {
    const mostRecentCall = node.expression;
    if (
      ts.isCallExpression(mostRecentCall) &&
      ts.isPropertyAccessExpression(mostRecentCall.expression)
    ) {
      const mostRecentPae = mostRecentCall.expression; // mySpy.calls.mostRecent
      if (
        ts.isIdentifier(mostRecentPae.name) &&
        mostRecentPae.name.text === 'mostRecent' &&
        ts.isPropertyAccessExpression(mostRecentPae.expression)
      ) {
        const spyIdentifier = getSpyIdentifierFromCalls(mostRecentPae.expression);
        if (spyIdentifier) {
          reporter.reportTransformation(
            sourceFile,
            node,
            'Transformed `spy.calls.mostRecent().args` to `vi.mocked(spy).mock.lastCall`.',
          );
          const mockProperty = createMockedSpyMockProperty(spyIdentifier);

          return createPropertyAccess(mockProperty, 'lastCall');
        }
      }
    }
  }

  if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
    const pae = node.expression; // e.g., mySpy.calls.count
    const spyIdentifier = ts.isPropertyAccessExpression(pae.expression)
      ? getSpyIdentifierFromCalls(pae.expression)
      : undefined;

    if (spyIdentifier) {
      const mockProperty = createMockedSpyMockProperty(spyIdentifier);
      const callsProperty = createPropertyAccess(mockProperty, 'calls');

      const callName = pae.name.text;
      let newExpression: ts.Node | undefined;
      let message: string | undefined;

      switch (callName) {
        case 'any':
          message = 'Transformed `spy.calls.any()` to a check on `mock.calls.length`.';
          newExpression = ts.factory.createBinaryExpression(
            createPropertyAccess(callsProperty, 'length'),
            ts.SyntaxKind.GreaterThanToken,
            ts.factory.createNumericLiteral(0),
          );
          break;
        case 'count':
          message = 'Transformed `spy.calls.count()` to `mock.calls.length`.';
          newExpression = createPropertyAccess(callsProperty, 'length');
          break;
        case 'first':
          message = 'Transformed `spy.calls.first()` to `mock.calls[0]`.';
          newExpression = ts.factory.createElementAccessExpression(callsProperty, 0);
          break;
        case 'all':
        case 'allArgs':
          message = `Transformed \`spy.calls.${callName}()\` to \`mock.calls\`.`;
          newExpression = callsProperty;
          break;
        case 'argsFor':
          message = 'Transformed `spy.calls.argsFor()` to `mock.calls[i]`.';
          newExpression = ts.factory.createElementAccessExpression(
            callsProperty,
            node.arguments[0],
          );
          break;
        case 'mostRecent':
          if (
            !ts.isPropertyAccessExpression(node.parent) ||
            !ts.isIdentifier(node.parent.name) ||
            node.parent.name.text !== 'args'
          ) {
            const category = 'mostRecent-without-args';
            reporter.recordTodo(category);
            addTodoComment(node, category);
          }

          return node;
      }

      if (newExpression && message) {
        reporter.reportTransformation(sourceFile, node, message);

        return newExpression;
      }
    }
  }

  return node;
}
