/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/**
 * @fileoverview This file contains transformers that migrate Jasmine matchers to their
 * Vitest counterparts. It handles a wide range of matchers, including syntactic sugar
 * (e.g., `toBeTrue`), asymmetric matchers (e.g., `jasmine.any`), async promise matchers
 * (`expectAsync`), and complex matchers that require restructuring, such as
 * `toHaveBeenCalledOnceWith` and `arrayWithExactContents`.
 */

import ts from '../../../third_party/github.com/Microsoft/TypeScript/lib/typescript';
import {
  addVitestValueImport,
  createExpectCallExpression,
  createPropertyAccess,
} from '../utils/ast-helpers';
import { getJasmineMethodName, isJasmineCallExpression } from '../utils/ast-validation';
import { addTodoComment } from '../utils/comment-helpers';
import { RefactorContext } from '../utils/refactor-context';

const SUGAR_MATCHER_CHANGES = new Map<string, { newName: string; newArgs?: ts.Expression[] }>([
  ['toBeTrue', { newName: 'toBe', newArgs: [ts.factory.createTrue()] }],
  ['toBeFalse', { newName: 'toBe', newArgs: [ts.factory.createFalse()] }],
  ['toBePositiveInfinity', { newName: 'toBe', newArgs: [ts.factory.createIdentifier('Infinity')] }],
  [
    'toBeNegativeInfinity',
    {
      newName: 'toBe',
      newArgs: [
        ts.factory.createPrefixUnaryExpression(
          ts.SyntaxKind.MinusToken,
          ts.factory.createIdentifier('Infinity'),
        ),
      ],
    },
  ],
  ['toHaveSize', { newName: 'toHaveLength' }],
]);

export function transformSyntacticSugarMatchers(
  node: ts.Node,
  { sourceFile, reporter }: RefactorContext,
): ts.Node {
  if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) {
    return node;
  }

  const pae = node.expression;
  const matcherName = pae.name.text;

  if (matcherName === 'toHaveSpyInteractions') {
    const category = 'toHaveSpyInteractions';
    reporter.recordTodo(category);
    addTodoComment(node, category);

    return node;
  }

  if (matcherName === 'toThrowMatching') {
    const category = 'toThrowMatching';
    reporter.recordTodo(category);
    addTodoComment(node, category, { name: matcherName });

    return node;
  }

  const mapping = SUGAR_MATCHER_CHANGES.get(matcherName);

  if (mapping) {
    reporter.reportTransformation(
      sourceFile,
      node,
      `Transformed matcher ".${matcherName}()" to ".${mapping.newName}()".`,
    );
    const newExpression = createPropertyAccess(pae.expression, mapping.newName);
    const newArgs = mapping.newArgs ?? [...node.arguments];

    return ts.factory.updateCallExpression(node, newExpression, node.typeArguments, newArgs);
  }

  return node;
}

const ASYMMETRIC_MATCHER_NAMES: ReadonlyArray<string> = [
  'anything',
  'any',
  'stringMatching',
  'objectContaining',
  'arrayContaining',
  'stringContaining',
];

export function transformAsymmetricMatchers(
  node: ts.Node,
  { sourceFile, reporter, pendingVitestValueImports }: RefactorContext,
): ts.Node {
  if (
    ts.isPropertyAccessExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === 'jasmine'
  ) {
    const matcherName = node.name.text;
    if (ASYMMETRIC_MATCHER_NAMES.includes(matcherName)) {
      addVitestValueImport(pendingVitestValueImports, 'expect');
      reporter.reportTransformation(
        sourceFile,
        node,
        `Transformed asymmetric matcher \`jasmine.${matcherName}\` to \`expect.${matcherName}\`.`,
      );

      return createPropertyAccess('expect', node.name);
    }
  }

  return node;
}

export function transformtoHaveBeenCalledBefore(
  node: ts.Node,
  { sourceFile, reporter }: RefactorContext,
): ts.Node {
  if (
    !ts.isCallExpression(node) ||
    !ts.isPropertyAccessExpression(node.expression) ||
    node.arguments.length !== 1
  ) {
    return node;
  }

  const pae = node.expression;
  const matcherName = pae.name.text;
  let isNegated = false;

  let expectExpression = pae.expression;
  if (ts.isPropertyAccessExpression(expectExpression) && expectExpression.name.text === 'not') {
    isNegated = true;
    expectExpression = expectExpression.expression;
  }

  if (!ts.isCallExpression(expectExpression) || matcherName !== 'toHaveBeenCalledBefore') {
    return node;
  }

  reporter.reportTransformation(
    sourceFile,
    node,
    'Transformed `toHaveBeenCalledBefore` to a Vitest-compatible spy invocation order comparison.',
  );

  const [spyB] = node.arguments;
  const [spyA] = expectExpression.arguments;

  const createInvocationOrderAccess = (spyIdentifier: ts.Expression) => {
    const mockedSpy = ts.factory.createCallExpression(
      createPropertyAccess('vi', 'mocked'),
      undefined,
      [spyIdentifier],
    );
    const mockProperty = createPropertyAccess(mockedSpy, 'mock');

    return createPropertyAccess(mockProperty, 'invocationCallOrder');
  };

  const createMinCall = (spyIdentifier: ts.Expression) => {
    return ts.factory.createCallExpression(createPropertyAccess('Math', 'min'), undefined, [
      ts.factory.createSpreadElement(createInvocationOrderAccess(spyIdentifier)),
    ]);
  };

  const newExpect = createExpectCallExpression([createMinCall(spyA)]);
  const newMatcherName = isNegated ? 'toBeGreaterThanOrEqual' : 'toBeLessThan';

  return ts.factory.createCallExpression(
    createPropertyAccess(newExpect, newMatcherName),
    undefined,
    [createMinCall(spyB)],
  );
}

export function transformToHaveClass(
  node: ts.Node,
  { sourceFile, reporter }: RefactorContext,
): ts.Node {
  if (
    !ts.isCallExpression(node) ||
    !ts.isPropertyAccessExpression(node.expression) ||
    node.arguments.length !== 1
  ) {
    return node;
  }

  const pae = node.expression;
  const matcherName = pae.name.text;
  let isNegated = false;

  let expectExpression = pae.expression;
  if (ts.isPropertyAccessExpression(expectExpression) && expectExpression.name.text === 'not') {
    isNegated = true;
    expectExpression = expectExpression.expression;
  }

  if (matcherName !== 'toHaveClass') {
    return node;
  }

  reporter.reportTransformation(
    sourceFile,
    node,
    'Transformed `.toHaveClass()` to a `classList.contains()` check.',
  );

  const [className] = node.arguments;
  const newExpectArgs: ts.Expression[] = [];

  if (ts.isCallExpression(expectExpression)) {
    const [element] = expectExpression.arguments;
    const classListContains = ts.factory.createCallExpression(
      createPropertyAccess(createPropertyAccess(element, 'classList'), 'contains'),
      undefined,
      [className],
    );
    newExpectArgs.push(classListContains);

    // Pass the context message from withContext to the new expect call
    if (expectExpression.arguments.length > 1) {
      newExpectArgs.push(expectExpression.arguments[1]);
    }
  } else {
    return node;
  }

  const newExpect = createExpectCallExpression(newExpectArgs);
  const newMatcher = isNegated ? ts.factory.createFalse() : ts.factory.createTrue();

  return ts.factory.createCallExpression(createPropertyAccess(newExpect, 'toBe'), undefined, [
    newMatcher,
  ]);
}

const ASYNC_MATCHER_CHANGES = new Map<
  string,
  {
    base: 'resolves' | 'rejects';
    matcher: string;
    not?: boolean;
    keepArgs?: boolean;
  }
>([
  ['toBeResolved', { base: 'resolves', matcher: 'toThrow', not: true, keepArgs: false }],
  ['toBeResolvedTo', { base: 'resolves', matcher: 'toEqual', keepArgs: true }],
  ['toBeRejected', { base: 'rejects', matcher: 'toThrow', keepArgs: false }],
  ['toBeRejectedWith', { base: 'rejects', matcher: 'toEqual', keepArgs: true }],
  ['toBeRejectedWithError', { base: 'rejects', matcher: 'toThrowError', keepArgs: true }],
]);

export function transformExpectAsync(
  node: ts.Node,
  { sourceFile, reporter }: RefactorContext,
): ts.Node {
  if (
    !ts.isCallExpression(node) ||
    !ts.isPropertyAccessExpression(node.expression) ||
    !ts.isCallExpression(node.expression.expression)
  ) {
    return node;
  }

  const matcherCall = node;
  const matcherPae = node.expression;
  const expectCall = node.expression.expression;

  if (!ts.isIdentifier(expectCall.expression) || expectCall.expression.text !== 'expectAsync') {
    return node;
  }

  const matcherName = ts.isIdentifier(matcherPae.name) ? matcherPae.name.text : undefined;
  const mapping = matcherName ? ASYNC_MATCHER_CHANGES.get(matcherName) : undefined;

  if (mapping) {
    reporter.reportTransformation(
      sourceFile,
      node,
      `Transformed \`expectAsync(...).${matcherName}\` to \`expect(...).${mapping.base}.${mapping.matcher}\`.`,
    );
    const newExpectCall = createExpectCallExpression([expectCall.arguments[0]]);
    let newMatcherChain: ts.Expression = createPropertyAccess(newExpectCall, mapping.base);

    if (mapping.not) {
      newMatcherChain = createPropertyAccess(newMatcherChain, 'not');
    }
    newMatcherChain = createPropertyAccess(newMatcherChain, mapping.matcher);

    const newMatcherArgs = mapping.keepArgs ? [...matcherCall.arguments] : [];

    return ts.factory.createCallExpression(newMatcherChain, undefined, newMatcherArgs);
  }

  if (matcherName) {
    if (matcherName === 'toBePending') {
      const category = 'toBePending';
      reporter.recordTodo(category);
      addTodoComment(node, category);
    } else {
      const category = 'unsupported-expect-async-matcher';
      reporter.recordTodo(category);
      addTodoComment(node, category, { name: matcherName });
    }
  }

  return node;
}

export function transformComplexMatchers(
  node: ts.Node,
  { sourceFile, reporter }: RefactorContext,
): ts.Node {
  if (
    !ts.isCallExpression(node) ||
    !ts.isPropertyAccessExpression(node.expression) ||
    node.expression.name.text !== 'toEqual' ||
    node.arguments.length !== 1
  ) {
    return node;
  }

  const argument = node.arguments[0];
  const jasmineMatcherName = getJasmineMethodName(argument);

  if (!jasmineMatcherName) {
    return node;
  }

  const expectCall = node.expression.expression;

  let newMatcherName: string | undefined;
  let newArgs: ts.Expression[] | undefined;
  let negate = false;

  switch (jasmineMatcherName) {
    case 'truthy':
      newMatcherName = 'toBeTruthy';
      break;
    case 'falsy':
      newMatcherName = 'toBeFalsy';
      break;
    case 'empty':
      newMatcherName = 'toHaveLength';
      newArgs = [ts.factory.createNumericLiteral(0)];
      break;
    case 'notEmpty':
      newMatcherName = 'toHaveLength';
      newArgs = [ts.factory.createNumericLiteral(0)];
      negate = true;
      break;
    case 'is':
      newMatcherName = 'toBe';
      if (ts.isCallExpression(argument)) {
        newArgs = [...argument.arguments];
      }
      break;
  }

  if (newMatcherName) {
    reporter.reportTransformation(
      sourceFile,
      node,
      `Transformed \`.toEqual(jasmine.${jasmineMatcherName}())\` to \`.${newMatcherName}()\`.`,
    );
    let expectExpression = expectCall;

    // Handle cases like `expect(...).not.toEqual(jasmine.notEmpty())`
    if (ts.isPropertyAccessExpression(expectCall) && expectCall.name.text === 'not') {
      // The original expression was negated, so flip the negate flag
      negate = !negate;
      // Use the expression before the `.not`
      expectExpression = expectCall.expression;
    }

    if (negate) {
      expectExpression = createPropertyAccess(expectExpression, 'not');
    }

    const newExpression = createPropertyAccess(expectExpression, newMatcherName);

    return ts.factory.createCallExpression(newExpression, undefined, newArgs ?? []);
  }

  return node;
}

export function transformArrayWithExactContents(
  node: ts.Node,
  { sourceFile, reporter }: RefactorContext,
): ts.Node | readonly ts.Node[] {
  if (
    !ts.isExpressionStatement(node) ||
    !ts.isCallExpression(node.expression) ||
    !ts.isPropertyAccessExpression(node.expression.expression) ||
    node.expression.expression.name.text !== 'toEqual' ||
    node.expression.arguments.length !== 1
  ) {
    return node;
  }

  const argument = node.expression.arguments[0];
  if (
    !isJasmineCallExpression(argument, 'arrayWithExactContents') ||
    argument.arguments.length !== 1
  ) {
    return node;
  }

  if (!ts.isArrayLiteralExpression(argument.arguments[0])) {
    const category = 'arrayWithExactContents-dynamic-variable';
    reporter.recordTodo(category);
    addTodoComment(node, category);

    return node;
  }

  reporter.reportTransformation(
    sourceFile,
    node,
    'Transformed `jasmine.arrayWithExactContents()` to `.toHaveLength()` and `.toEqual(expect.arrayContaining())`.',
  );

  const expectCall = node.expression.expression.expression;
  const arrayLiteral = argument.arguments[0];

  const lengthCall = ts.factory.createCallExpression(
    createPropertyAccess(expectCall, 'toHaveLength'),
    undefined,
    [ts.factory.createNumericLiteral(arrayLiteral.elements.length)],
  );

  const containingCall = ts.factory.createCallExpression(
    createPropertyAccess(expectCall, 'toEqual'),
    undefined,
    [
      ts.factory.createCallExpression(
        createPropertyAccess('expect', 'arrayContaining'),
        undefined,
        [arrayLiteral],
      ),
    ],
  );

  return [
    ts.factory.createExpressionStatement(lengthCall),
    ts.factory.createExpressionStatement(containingCall),
  ];
}

export function transformCalledOnceWith(
  node: ts.Node,
  { sourceFile, reporter }: RefactorContext,
): ts.Node | readonly ts.Node[] {
  if (!ts.isExpressionStatement(node)) {
    return node;
  }

  const call = node.expression;
  if (
    !ts.isCallExpression(call) ||
    !ts.isPropertyAccessExpression(call.expression) ||
    call.expression.name.text !== 'toHaveBeenCalledOnceWith'
  ) {
    return node;
  }

  reporter.reportTransformation(
    sourceFile,
    node,
    'Transformed `.toHaveBeenCalledOnceWith()` to `.toHaveBeenCalledTimes(1)` and `.toHaveBeenCalledWith()`.',
  );

  const expectCall = call.expression.expression;
  const args = call.arguments;

  const timesCall = ts.factory.createCallExpression(
    createPropertyAccess(expectCall, 'toHaveBeenCalledTimes'),
    undefined,
    [ts.factory.createNumericLiteral(1)],
  );

  const withCall = ts.factory.createCallExpression(
    createPropertyAccess(expectCall, 'toHaveBeenCalledWith'),
    undefined,
    args,
  );

  return [
    ts.factory.createExpressionStatement(timesCall),
    ts.factory.createExpressionStatement(withCall),
  ];
}

export function transformWithContext(
  node: ts.Node,
  { sourceFile, reporter }: RefactorContext,
): ts.Node {
  if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) {
    return node;
  }

  // Traverse the chain of property access expressions to find the .withContext() call
  let currentExpression: ts.Expression = node.expression;
  const propertyChain: ts.Identifier[] = [];

  while (ts.isPropertyAccessExpression(currentExpression)) {
    if (!ts.isIdentifier(currentExpression.name)) {
      // Break if we encounter a private identifier or something else unexpected
      return node;
    }
    propertyChain.push(currentExpression.name);
    currentExpression = currentExpression.expression;
  }

  const withContextCall = currentExpression;
  // Check if we found a .withContext() call
  if (
    !ts.isCallExpression(withContextCall) ||
    !ts.isPropertyAccessExpression(withContextCall.expression) ||
    !ts.isIdentifier(withContextCall.expression.name) ||
    withContextCall.expression.name.text !== 'withContext'
  ) {
    return node;
  }

  reporter.reportTransformation(
    sourceFile,
    withContextCall,
    'Transformed `.withContext()` to the `expect(..., message)` syntax.',
  );

  const expectCall = withContextCall.expression.expression;

  if (
    !ts.isCallExpression(expectCall) ||
    !ts.isIdentifier(expectCall.expression) ||
    expectCall.expression.text !== 'expect'
  ) {
    return node;
  }

  const contextMessage = withContextCall.arguments[0];
  if (!contextMessage) {
    // No message provided, so unwrap the .withContext() call.
    let newChain: ts.Expression = expectCall;
    for (let i = propertyChain.length - 1; i >= 0; i--) {
      newChain = ts.factory.createPropertyAccessExpression(newChain, propertyChain[i]);
    }

    return ts.factory.updateCallExpression(node, newChain, node.typeArguments, node.arguments);
  }

  const newExpectArgs = [...expectCall.arguments, contextMessage];
  const newExpectCall = ts.factory.updateCallExpression(
    expectCall,
    expectCall.expression,
    expectCall.typeArguments,
    newExpectArgs,
  );

  // Rebuild the property access chain
  let newExpression: ts.Expression = newExpectCall;
  for (let i = propertyChain.length - 1; i >= 0; i--) {
    newExpression = ts.factory.createPropertyAccessExpression(newExpression, propertyChain[i]);
  }

  return ts.factory.updateCallExpression(node, newExpression, node.typeArguments, node.arguments);
}

export function transformExpectNothing(
  node: ts.Node,
  { sourceFile, reporter }: RefactorContext,
): ts.Node {
  if (!ts.isExpressionStatement(node)) {
    return node;
  }

  const call = node.expression;
  if (
    !ts.isCallExpression(call) ||
    !ts.isPropertyAccessExpression(call.expression) ||
    !ts.isIdentifier(call.expression.name) ||
    call.expression.name.text !== 'nothing'
  ) {
    return node;
  }

  const expectCall = call.expression.expression;
  if (
    !ts.isCallExpression(expectCall) ||
    !ts.isIdentifier(expectCall.expression) ||
    expectCall.expression.text !== 'expect' ||
    expectCall.arguments.length > 0
  ) {
    return node;
  }

  // The statement is `expect().nothing()`, which can be removed.
  const replacement = ts.factory.createEmptyStatement();
  const originalText = node.getFullText().trim();

  reporter.reportTransformation(sourceFile, node, 'Removed `expect().nothing()` statement.');
  const category = 'expect-nothing';
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
