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
 * and the inspection of spy calls (`spy.calls.reset`, `spy.calls.first`, `spy.calls.mostRecent`,
 * `spy.calls.all`, and the `args`, `returnValue`, and `object` properties of their results).
 */

import ts from 'typescript';
import {
  addVitestTypeImport,
  addVitestValueImport,
  createPropertyAccess,
  getPromiseResolveRejectMethod,
} from '../utils/ast-helpers';
import { getJasmineMethodName, isJasmineCallExpression } from '../utils/ast-validation';
import { addTodoComment } from '../utils/comment-helpers';
import { RefactorContext } from '../utils/refactor-context';
import { createViCallExpression } from '../utils/refactor-helpers';

/**
 * Expression wrappers that do not affect the runtime value of the wrapped expression and
 * can be looked through when matching Jasmine spy patterns.
 */
type TransparentWrapper =
  | ts.ParenthesizedExpression
  | ts.AsExpression
  | ts.NonNullExpression
  | ts.TypeAssertion
  | ts.SatisfiesExpression;

function isTransparentWrapper(node: ts.Node): node is TransparentWrapper {
  return (
    ts.isParenthesizedExpression(node) ||
    ts.isAsExpression(node) ||
    ts.isNonNullExpression(node) ||
    ts.isTypeAssertionExpression(node) ||
    ts.isSatisfiesExpression(node)
  );
}

/**
 * Returns the innermost expression after removing any transparent wrappers
 * (parentheses, non-null assertions, and type assertions).
 */
function unwrapExpression(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (isTransparentWrapper(current)) {
    current = current.expression;
  }

  return current;
}

/**
 * Returns the nearest ancestor of a node that is not a transparent wrapper.
 */
function getUnwrappedParent(node: ts.Node): ts.Node | undefined {
  let parent: ts.Node | undefined = node.parent;
  while (parent && isTransparentWrapper(parent)) {
    parent = parent.parent;
  }

  return parent;
}

function isChainedWithAnd(node: ts.Node): boolean {
  let parent = node.parent;
  while (parent) {
    if (ts.isPropertyAccessExpression(parent)) {
      if (ts.isIdentifier(parent.name) && parent.name.text === 'and') {
        return true;
      }
    } else if (ts.isElementAccessExpression(parent)) {
      if (
        ts.isStringLiteralLike(parent.argumentExpression) &&
        parent.argumentExpression.text === 'and'
      ) {
        return true;
      }
    } else if (isTransparentWrapper(parent)) {
      parent = parent.parent;
      continue;
    }
    break;
  }

  return false;
}

function isSpyCreation(node: ts.Expression): boolean {
  const expression = unwrapExpression(node);
  if (!ts.isCallExpression(expression)) {
    return false;
  }

  if (ts.isIdentifier(expression.expression)) {
    return expression.expression.text === 'spyOn' || expression.expression.text === 'spyOnProperty';
  }

  return isJasmineCallExpression(expression, 'createSpy');
}

function transformPrimarySpy(node: ts.CallExpression, refactorCtx: RefactorContext): ts.Node {
  const { sourceFile, reporter, pendingVitestValueImports } = refactorCtx;
  if (
    ts.isIdentifier(node.expression) &&
    (node.expression.text === 'spyOn' || node.expression.text === 'spyOnProperty')
  ) {
    addVitestValueImport(pendingVitestValueImports, 'vi');

    // `spyOnProperty` defaults to the getter while `vi.spyOn` needs the access type to spy on
    // a property instead of a method.
    const args =
      node.expression.text === 'spyOnProperty' && node.arguments.length === 2
        ? [...node.arguments, ts.factory.createStringLiteral('get', true)]
        : node.arguments;

    const viSpyOnCall = ts.factory.updateCallExpression(
      node,
      createPropertyAccess('vi', 'spyOn'),
      node.typeArguments,
      args,
    );

    if (isChainedWithAnd(node)) {
      reporter.reportTransformation(
        sourceFile,
        node,
        `Transformed \`${node.expression.text}\` to \`vi.spyOn\`.`,
      );

      return viSpyOnCall;
    }

    reporter.reportTransformation(
      sourceFile,
      node,
      `Transformed \`${node.expression.text}\` to \`vi.spyOn\`, ` +
        `appending \`.mockReturnValue(undefined)\` to preserve stub-by-default semantics.`,
    );

    return ts.factory.createCallExpression(
      createPropertyAccess(viSpyOnCall, 'mockReturnValue'),
      undefined,
      [ts.factory.createIdentifier('undefined')],
    );
  }

  return node;
}

function transformSpyStrategy(node: ts.CallExpression, refactorCtx: RefactorContext): ts.Node {
  const { sourceFile, reporter } = refactorCtx;
  if (!ts.isPropertyAccessExpression(node.expression)) {
    return node;
  }

  const pae = node.expression;
  let spyCall: ts.Expression | undefined;

  if (
    ts.isPropertyAccessExpression(pae.expression) &&
    ts.isIdentifier(pae.expression.name) &&
    pae.expression.name.text === 'and'
  ) {
    spyCall = pae.expression.expression;
  } else if (
    ts.isElementAccessExpression(pae.expression) &&
    ts.isStringLiteralLike(pae.expression.argumentExpression) &&
    pae.expression.argumentExpression.text === 'and'
  ) {
    spyCall = pae.expression.expression;
  }

  if (spyCall) {
    let newMethodName: string | undefined;
    let args = node.arguments;

    if (ts.isIdentifier(pae.name)) {
      const strategyName = pae.name.text;
      switch (strategyName) {
        case 'returnValue':
          {
            const firstArg = args[0];
            const result = firstArg ? getPromiseResolveRejectMethod(firstArg) : null;
            if (result) {
              const methodMapping = {
                'resolve': 'mockResolvedValue',
                'reject': 'mockRejectedValue',
              };
              newMethodName = methodMapping[result.methodName];
              args = result.arguments;
            } else {
              newMethodName = 'mockReturnValue';
            }
          }
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
          if (!isSpyCreation(spyCall)) {
            // On an existing spy, `.and.callThrough()` restores the original implementation,
            // so it is not redundant and cannot be dropped.
            const category = 'callThrough-on-existing-spy';
            reporter.recordTodo(category, sourceFile, node);
            addTodoComment(node, category);

            return node;
          }

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
            errorArg && ts.isNewExpression(errorArg)
              ? errorArg
              : ts.factory.createNewExpression(
                  ts.factory.createIdentifier('Error'),
                  undefined,
                  errorArg ? [errorArg] : [],
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
        case 'identity': {
          reporter.reportTransformation(
            sourceFile,
            node,
            'Transformed `.and.identity()` to `.getMockName()`.',
          );
          const newExpression = createPropertyAccess(spyCall, 'getMockName');

          return ts.factory.createCallExpression(newExpression, undefined, undefined);
        }
        default: {
          const category = 'unsupported-spy-strategy';
          reporter.recordTodo(category, sourceFile, node);
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

        return ts.factory.updateCallExpression(node, newExpression, node.typeArguments, args);
      }
    }
  }

  return node;
}

function transformSpyOnAllFunctions(
  node: ts.CallExpression,
  refactorCtx: RefactorContext,
): ts.Node {
  const { sourceFile, reporter } = refactorCtx;
  if (getJasmineMethodName(node) === 'spyOnAllFunctions') {
    reporter.reportTransformation(
      sourceFile,
      node,
      'Found unsupported `jasmine.spyOnAllFunctions()`.',
    );
    const category = 'spyOnAllFunctions';
    reporter.recordTodo(category, sourceFile, node);
    addTodoComment(node, category);

    return node;
  }

  return node;
}

export function transformSpies(node: ts.Node, refactorCtx: RefactorContext): ts.Node {
  if (!ts.isCallExpression(node)) {
    return node;
  }

  const primaryResult = transformPrimarySpy(node, refactorCtx);
  if (primaryResult !== node) {
    return primaryResult;
  }

  const strategyResult = transformSpyStrategy(node, refactorCtx);
  if (strategyResult !== node) {
    return strategyResult;
  }

  return transformSpyOnAllFunctions(node, refactorCtx);
}

export function transformCreateSpy(node: ts.Node, ctx: RefactorContext): ts.Node {
  const { reporter, sourceFile, pendingVitestValueImports } = ctx;
  if (!isJasmineCallExpression(node, 'createSpy')) {
    return node;
  }

  addVitestValueImport(pendingVitestValueImports, 'vi');
  reporter.reportTransformation(
    sourceFile,
    node,
    'Transformed `jasmine.createSpy()` to `vi.fn()`.',
  );

  const spyName = node.arguments[0];
  const viFnCallExpression = createViCallExpression(
    ctx,
    'fn',
    node.arguments.length > 1 ? [node.arguments[1]] : [],
  );

  // jasmine.createSpy() -> vi.fn()
  // jasmine.createSpy(name, originalFn) -> vi.fn(originalFn).mockName(name)
  return !spyName
    ? viFnCallExpression
    : ts.factory.createCallExpression(
        createPropertyAccess(viFnCallExpression, 'mockName'),
        undefined,
        [node.arguments[0]],
      );
}

export function transformCreateSpyObj(node: ts.Node, ctx: RefactorContext): ts.Node {
  const { reporter, sourceFile, pendingVitestValueImports } = ctx;
  if (!isJasmineCallExpression(node, 'createSpyObj')) {
    return node;
  }

  addVitestValueImport(pendingVitestValueImports, 'vi');
  reporter.reportTransformation(
    sourceFile,
    node,
    'Transformed `jasmine.createSpyObj()` to an object literal with `vi.fn()`.',
  );

  const firstArg = node.arguments[0];
  const hasBaseName = ts.isStringLiteral(firstArg);
  const baseName = hasBaseName ? firstArg.text : undefined;
  const methods = hasBaseName ? node.arguments[1] : firstArg;
  const propertiesArg = hasBaseName ? node.arguments[2] : node.arguments[1];
  let properties: ts.PropertyAssignment[];

  if (node.arguments.length < 2 && hasBaseName) {
    const category = 'createSpyObj-single-argument';
    reporter.recordTodo(category, sourceFile, node);
    addTodoComment(node, category);

    return node;
  }

  if (ts.isArrayLiteralExpression(methods)) {
    properties = createSpyObjWithArray(ctx, methods, baseName);
  } else if (ts.isObjectLiteralExpression(methods)) {
    properties = createSpyObjWithObject(ctx, methods, baseName);
  } else {
    const category = 'createSpyObj-dynamic-variable';
    reporter.recordTodo(category, sourceFile, node);
    addTodoComment(node, category);

    return node;
  }

  if (propertiesArg) {
    if (ts.isObjectLiteralExpression(propertiesArg)) {
      properties.push(...(propertiesArg.properties as unknown as ts.PropertyAssignment[]));
    } else {
      const category = 'createSpyObj-dynamic-property-map';
      reporter.recordTodo(category, sourceFile, node);
      addTodoComment(node, category);
    }
  }

  const spyObjLiteral = ts.factory.createObjectLiteralExpression(properties, true);

  // The literal only has the spied members, so it is not assignable to the `MockedObject<T>`
  // that a `jasmine.SpyObj<T>` annotation is transformed to. Jasmine's untyped `createSpyObj`
  // returns `any`, which is why the original assignment compiled.
  const spyObjTypeArguments = getAssignedSpyObjTypeArguments(node);
  if (!spyObjTypeArguments) {
    return spyObjLiteral;
  }

  addVitestTypeImport(ctx.pendingVitestTypeImports, 'MockedObject');

  return ts.factory.createAsExpression(
    spyObjLiteral,
    ts.factory.createTypeReferenceNode('MockedObject', spyObjTypeArguments),
  );
}

function getSpyObjTypeArguments(
  type: ts.TypeNode | undefined,
): ts.NodeArray<ts.TypeNode> | undefined {
  if (
    type &&
    ts.isTypeReferenceNode(type) &&
    ts.isQualifiedName(type.typeName) &&
    ts.isIdentifier(type.typeName.left) &&
    type.typeName.left.text === 'jasmine' &&
    type.typeName.right.text === 'SpyObj'
  ) {
    return type.typeArguments;
  }

  return undefined;
}

/**
 * Finds the declaration of a variable in the blocks that enclose a node, nearest first,
 * so that a variable declared in another `describe` block with the same name is not used.
 */
function findEnclosingVariableDeclaration(
  node: ts.Node,
  name: string,
): ts.VariableDeclaration | undefined {
  for (let current = node.parent; current; current = current.parent) {
    if (!ts.isBlock(current) && !ts.isSourceFile(current)) {
      continue;
    }

    for (const statement of current.statements) {
      if (!ts.isVariableStatement(statement)) {
        continue;
      }

      const declaration = statement.declarationList.declarations.find(
        (d) => ts.isIdentifier(d.name) && d.name.text === name,
      );
      if (declaration) {
        return declaration;
      }
    }
  }

  return undefined;
}

/**
 * Finds the `T` of a `jasmine.SpyObj<T>` annotation on the variable that a `createSpyObj` call
 * initializes (`const spy: jasmine.SpyObj<T> = ...`) or is assigned to (`spy = ...`).
 */
function getAssignedSpyObjTypeArguments(
  node: ts.CallExpression,
): ts.NodeArray<ts.TypeNode> | undefined {
  const parent = getUnwrappedParent(node);
  if (!parent) {
    return undefined;
  }

  if (ts.isVariableDeclaration(parent)) {
    return getSpyObjTypeArguments(parent.type);
  }

  if (
    !ts.isBinaryExpression(parent) ||
    parent.operatorToken.kind !== ts.SyntaxKind.EqualsToken ||
    !ts.isIdentifier(parent.left)
  ) {
    return undefined;
  }

  return getSpyObjTypeArguments(findEnclosingVariableDeclaration(parent, parent.left.text)?.type);
}

function createSpyObjWithArray(
  ctx: RefactorContext,
  methods: ts.ArrayLiteralExpression,
  baseName: string | undefined,
): ts.PropertyAssignment[] {
  return methods.elements
    .map((element) => {
      if (ts.isStringLiteral(element)) {
        const mockFn = createViCallExpression(ctx, 'fn');
        const methodName = element.text;
        let finalExpression: ts.Expression = mockFn;

        if (baseName) {
          finalExpression = ts.factory.createCallExpression(
            createPropertyAccess(finalExpression, 'mockName'),
            undefined,
            [ts.factory.createStringLiteral(`${baseName}.${methodName}`)],
          );
        }

        return ts.factory.createPropertyAssignment(
          ts.factory.createIdentifier(methodName),
          finalExpression,
        );
      }

      return undefined;
    })
    .filter((p): p is ts.PropertyAssignment => !!p);
}

function createSpyObjWithObject(
  ctx: RefactorContext,
  methods: ts.ObjectLiteralExpression,
  baseName: string | undefined,
): ts.PropertyAssignment[] {
  return methods.properties
    .map((prop) => {
      if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
        const methodName = prop.name.text;
        const returnValue = prop.initializer;
        let mockFn = createViCallExpression(ctx, 'fn');

        if (baseName) {
          mockFn = ts.factory.createCallExpression(
            createPropertyAccess(mockFn, 'mockName'),
            undefined,
            [ts.factory.createStringLiteral(`${baseName}.${methodName}`)],
          );
        }

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

function createMockedSpyMockProperty(
  spyIdentifier: ts.Expression,
  pendingVitestValueImports: Set<string>,
): ts.PropertyAccessExpression {
  addVitestValueImport(pendingVitestValueImports, 'vi');
  const mockedSpy = ts.factory.createCallExpression(
    createPropertyAccess('vi', 'mocked'),
    undefined,
    [spyIdentifier],
  );

  return createPropertyAccess(mockedSpy, 'mock');
}

/**
 * Maps the properties of a Jasmine `CallInfo` object to the corresponding property on
 * Vitest's `MockContext`. The optional `valueAccess` is a trailing property that must be
 * accessed on the resulting element (e.g. `mock.results[i].value`).
 */
const CALL_INFO_PROPERTIES = new Map<string, { mockProperty: string; valueAccess?: string }>([
  ['args', { mockProperty: 'calls' }],
  ['returnValue', { mockProperty: 'results', valueAccess: 'value' }],
  ['object', { mockProperty: 'contexts' }],
]);

/**
 * Describes a matched expression that evaluates to a Jasmine `CallInfo` object.
 */
interface CallInfoAccess {
  /** The expression representing the spy (e.g. `mySpy` in `mySpy.calls.first()`). */
  spyIdentifier: ts.Expression;

  /** The index of the call, or `'last'` when referring to the most recent call. */
  index: ts.Expression | 'last';

  /** A human-readable representation of the matched Jasmine source, for reporting. */
  sourceText: string;

  /** A human-readable representation of the index used in the replacement, for reporting. */
  indexText: string;
}

/**
 * Attempts to match an expression that yields a Jasmine `CallInfo` object:
 * `spy.calls.first()`, `spy.calls.mostRecent()`, or `spy.calls.all()[i]`.
 */
function getCallInfoAccess(expression: ts.Expression): CallInfoAccess | undefined {
  const unwrapped = unwrapExpression(expression);
  let indexExpression: ts.Expression | undefined;
  let callExpression: ts.Expression = unwrapped;
  if (ts.isElementAccessExpression(unwrapped)) {
    indexExpression = unwrapped.argumentExpression;
    callExpression = unwrapExpression(unwrapped.expression);
  }

  if (
    !ts.isCallExpression(callExpression) ||
    !ts.isPropertyAccessExpression(callExpression.expression)
  ) {
    return undefined;
  }

  const methodPae = callExpression.expression;
  if (!ts.isIdentifier(methodPae.name) || !ts.isPropertyAccessExpression(methodPae.expression)) {
    return undefined;
  }

  const spyIdentifier = getSpyIdentifierFromCalls(methodPae.expression);
  if (!spyIdentifier) {
    return undefined;
  }

  const methodName = methodPae.name.text;
  if (indexExpression) {
    // Only `spy.calls.all()[i]` is supported when an element access is present.
    return methodName === 'all'
      ? { spyIdentifier, index: indexExpression, sourceText: 'spy.calls.all()[i]', indexText: 'i' }
      : undefined;
  }

  switch (methodName) {
    case 'first':
      return {
        spyIdentifier,
        index: ts.factory.createNumericLiteral(0),
        sourceText: 'spy.calls.first()',
        indexText: '0',
      };
    case 'mostRecent':
      return { spyIdentifier, index: 'last', sourceText: 'spy.calls.mostRecent()', indexText: '' };
  }

  return undefined;
}

/**
 * Transforms property accesses on a Jasmine `CallInfo` object (`.args`, `.returnValue`,
 * `.object`) obtained via `spy.calls.first()`, `spy.calls.mostRecent()`, or `spy.calls.all()[i]`
 * into the equivalent Vitest `MockContext` access.
 *
 * @example
 * spy.calls.first().args              -> vi.mocked(spy).mock.calls[0]
 * spy.calls.mostRecent().args         -> vi.mocked(spy).mock.lastCall
 * spy.calls.all()[i].args             -> vi.mocked(spy).mock.calls[i]
 * spy.calls.first().returnValue       -> vi.mocked(spy).mock.results[0].value
 * spy.calls.mostRecent().returnValue  -> vi.mocked(spy).mock.results.at(-1)?.value
 * spy.calls.all()[i].object           -> vi.mocked(spy).mock.contexts[i]
 * spy.calls.mostRecent().object       -> vi.mocked(spy).mock.contexts.at(-1)
 */
function transformCallInfoProperty(
  node: ts.Node,
  { sourceFile, reporter, pendingVitestValueImports }: RefactorContext,
): ts.Node {
  if (!ts.isPropertyAccessExpression(node) || !ts.isIdentifier(node.name)) {
    return node;
  }

  const propertyName = node.name.text;
  const mapping = CALL_INFO_PROPERTIES.get(propertyName);
  if (!mapping) {
    return node;
  }

  const callInfo = getCallInfoAccess(node.expression);
  if (!callInfo) {
    return node;
  }

  const mockProperty = createMockedSpyMockProperty(
    callInfo.spyIdentifier,
    pendingVitestValueImports,
  );
  const mockCollection = createPropertyAccess(mockProperty, mapping.mockProperty);

  // Note: for `args` and `object`, an optional access (`?.`) in the source is intentionally
  // not carried over. The replacement is a plain element access (e.g. `mock.calls[0]`), which
  // already evaluates to `undefined` when the spy has not been called, so the result of the
  // transformed expression itself is unchanged. Only `returnValue` has a trailing `.value`
  // access that must remain optional to avoid throwing on a missing call.
  const accessOperator = node.questionDotToken ? '?.' : '.';

  let replacement: ts.Expression;
  let replacementText: string;
  if (callInfo.index === 'last') {
    if (propertyName === 'args') {
      // Vitest provides a dedicated shorthand for the arguments of the last call.
      replacement = createPropertyAccess(mockProperty, 'lastCall');
      replacementText = 'vi.mocked(spy).mock.lastCall';
    } else {
      // `mock.<collection>.at(-1)`; the result may be `undefined` if the spy was never called,
      // so a trailing value access must always be optional.
      replacement = ts.factory.createCallExpression(
        createPropertyAccess(mockCollection, 'at'),
        undefined,
        [
          ts.factory.createPrefixUnaryExpression(
            ts.SyntaxKind.MinusToken,
            ts.factory.createNumericLiteral(1),
          ),
        ],
      );
      replacementText = `vi.mocked(spy).mock.${mapping.mockProperty}.at(-1)`;
      if (mapping.valueAccess) {
        replacement = ts.factory.createPropertyAccessChain(
          replacement,
          ts.factory.createToken(ts.SyntaxKind.QuestionDotToken),
          mapping.valueAccess,
        );
        replacementText += `?.${mapping.valueAccess}`;
      }
    }
  } else {
    replacement = ts.factory.createElementAccessExpression(mockCollection, callInfo.index);
    replacementText = `vi.mocked(spy).mock.${mapping.mockProperty}[${callInfo.indexText}]`;
    if (mapping.valueAccess) {
      replacement = node.questionDotToken
        ? ts.factory.createPropertyAccessChain(
            replacement,
            ts.factory.createToken(ts.SyntaxKind.QuestionDotToken),
            mapping.valueAccess,
          )
        : createPropertyAccess(replacement, mapping.valueAccess);
      replacementText += `${accessOperator}${mapping.valueAccess}`;
    }
  }

  reporter.reportTransformation(
    sourceFile,
    node,
    `Transformed \`${callInfo.sourceText}${accessOperator}${propertyName}\` to \`${replacementText}\`.`,
  );

  return replacement;
}

function transformThisFor(
  node: ts.Node,
  { sourceFile, reporter, pendingVitestValueImports }: RefactorContext,
): ts.Node {
  // Check 1: Is the node is a call expression?
  if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) {
    return node;
  }

  // Check 2: Is it a call to `.thisFor`?
  const thisForPae = node.expression;
  if (
    !ts.isIdentifier(thisForPae.name) ||
    thisForPae.name.text !== 'thisFor' ||
    !ts.isPropertyAccessExpression(thisForPae.expression)
  ) {
    return node;
  }

  // Check 3: Can we get the spy identifier from `spy.calls`?
  const spyIdentifier = getSpyIdentifierFromCalls(thisForPae.expression);
  if (!spyIdentifier) {
    return node;
  }

  // If all checks pass, perform the transformation.
  reporter.reportTransformation(
    sourceFile,
    node,
    'Transformed `spy.calls.thisFor(index)` to `vi.mocked(spy).mock.contexts[index]`.',
  );
  const mockProperty = createMockedSpyMockProperty(spyIdentifier, pendingVitestValueImports);

  return ts.factory.createElementAccessExpression(
    createPropertyAccess(mockProperty, 'contexts'),
    node.arguments[0] ?? ts.factory.createNumericLiteral(0),
  );
}

export function transformSpyCallInspection(node: ts.Node, refactorCtx: RefactorContext): ts.Node {
  const callInfoPropertyTransformed = transformCallInfoProperty(node, refactorCtx);
  if (callInfoPropertyTransformed !== node) {
    return callInfoPropertyTransformed;
  }

  const thisForTransformed = transformThisFor(node, refactorCtx);
  if (thisForTransformed !== node) {
    return thisForTransformed;
  }

  if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) {
    return node;
  }

  const { sourceFile, reporter, pendingVitestValueImports } = refactorCtx;

  const pae = node.expression; // e.g., mySpy.calls.count
  const spyIdentifier = ts.isPropertyAccessExpression(pae.expression)
    ? getSpyIdentifierFromCalls(pae.expression)
    : undefined;

  if (spyIdentifier) {
    const mockProperty = createMockedSpyMockProperty(spyIdentifier, pendingVitestValueImports);
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
        newExpression = ts.factory.createElementAccessExpression(callsProperty, node.arguments[0]);
        break;
      case 'saveArgumentsByValue':
        {
          const category = 'saveArgumentsByValue';
          reporter.recordTodo(category, sourceFile, node);
          addTodoComment(node, category);
        }
        break;
      case 'mostRecent': {
        // Accesses such as `.args`, `.returnValue`, and `.object` are handled by
        // `transformCallInfoProperty`; only a bare `mostRecent()` requires manual migration.
        const parent = getUnwrappedParent(node);
        if (
          !parent ||
          !ts.isPropertyAccessExpression(parent) ||
          !ts.isIdentifier(parent.name) ||
          !CALL_INFO_PROPERTIES.has(parent.name.text)
        ) {
          const category = 'mostRecent-without-args';
          reporter.recordTodo(category, sourceFile, node);
          addTodoComment(node, category);
        }

        return node;
      }
    }

    if (newExpression && message) {
      reporter.reportTransformation(sourceFile, node, message);

      return newExpression;
    }
  }

  return node;
}
