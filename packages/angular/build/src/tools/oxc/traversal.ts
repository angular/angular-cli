/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { Node } from '@oxc-project/types';
import { visitorKeys } from 'oxc-parser';

/**
 * Contextual scope information provided to AST visitor callbacks during traversal.
 */
export interface TraversalContext {
  /**
   * The current function nesting depth. Top-level code has depth 0.
   */
  functionDepth: number;

  /**
   * The current class nesting depth. Top-level code has depth 0.
   */
  classDepth: number;

  /**
   * The immediate enclosing function AST node, if currently inside a function.
   */
  parentFunc?: Node;
}

/**
 * A set of TypeScript AST node types that contain executable code or runtime declarations.
 */
const executableTypeScriptNodes = new Set<Node['type']>([
  'TSEnumDeclaration',
  'TSEnumBody',
  'TSEnumMember',
  'TSModuleDeclaration',
  'TSModuleBlock',
  'TSParameterProperty',
  'TSImportEqualsDeclaration',
  'TSExternalModuleReference',
]);

/**
 * Determines whether the given AST node type represents a function declaration or expression.
 *
 * @param type The AST node type to check.
 * @returns True if the type is a function; otherwise, false.
 */
function isFunction(type: Node['type']): boolean {
  return (
    type === 'FunctionDeclaration' ||
    type === 'FunctionExpression' ||
    type === 'ArrowFunctionExpression'
  );
}

/**
 * Determines whether the given AST node type represents a class declaration or expression.
 *
 * @param type The AST node type to check.
 * @returns True if the type is a class; otherwise, false.
 */
function isClass(type: Node['type']): boolean {
  return type === 'ClassDeclaration' || type === 'ClassExpression';
}

/**
 * Determines whether the given AST node type represents a non-executable TypeScript type-only node.
 * Executable TypeScript nodes (e.g. enums, namespaces, parameter properties) return false.
 *
 * @param type The AST node type to check.
 * @returns True if the type is a TypeScript type construct that can be safely pruned; otherwise, false.
 */
function isTypeOnlyTypeScriptNode(type: Node['type']): boolean {
  return type.startsWith('TS') && !executableTypeScriptNodes.has(type);
}

/**
 * Pushes an array of AST nodes onto the traversal stack in reverse order.
 *
 * @param nodes The array of child AST nodes to push.
 * @param stack The traversal stack.
 */
function pushNodesReverse(
  nodes: readonly (Node | null | undefined)[] | undefined,
  stack: (Node | null)[],
): void {
  if (nodes) {
    for (let i = nodes.length - 1; i >= 0; i--) {
      const item = nodes[i];
      if (item) {
        stack.push(item);
      }
    }
  }
}

/**
 * Pushes child AST nodes of the specified node onto the traversal stack in reverse order
 * so they are visited in source order.
 *
 * Explicit cases are provided for the most common AST node types (~95%+ of AST nodes) to:
 * 1. Fast-path leaf nodes and frequent expressions/statements by avoiding dynamic `visitorKeys`
 *    dictionary lookups, string indexing, and dynamic array iteration.
 * 2. Prune non-executable TypeScript type subtrees (e.g. `typeAnnotation`, `typeParameters`,
 *    `returnType`, `implements`) so traversal only processes executable JavaScript expressions.
 *
 * All other less frequent node types fall back to the `visitorKeys` lookup in `default:`.
 *
 * @param node The parent AST node whose children to push.
 * @param stack The traversal stack.
 */
function pushChildNodes(node: Node, stack: (Node | null)[]): void {
  switch (node.type) {
    // High-frequency leaf nodes (~50% of AST)
    case 'Identifier':
    case 'PrivateIdentifier':
    case 'Literal':
    case 'ThisExpression':
      break;

    case 'Program':
    case 'BlockStatement':
    case 'ClassBody':
    case 'StaticBlock':
      pushNodesReverse(node.body, stack);
      break;

    case 'ExpressionStatement':
    case 'ParenthesizedExpression':
    case 'ChainExpression':
    case 'TSNonNullExpression':
    case 'TSAsExpression':
    case 'TSTypeAssertion':
    case 'TSSatisfiesExpression':
    case 'TSInstantiationExpression':
    case 'TSExportAssignment':
      if (node.expression) {
        stack.push(node.expression);
      }
      break;

    case 'CallExpression':
    case 'NewExpression':
      pushNodesReverse(node.arguments, stack);
      if (node.callee) {
        stack.push(node.callee);
      }
      break;

    case 'MemberExpression':
      if (node.property) {
        stack.push(node.property);
      }
      if (node.object) {
        stack.push(node.object);
      }
      break;

    case 'BinaryExpression':
    case 'LogicalExpression':
    case 'AssignmentExpression':
      if (node.right) {
        stack.push(node.right);
      }
      if (node.left) {
        stack.push(node.left);
      }
      break;

    case 'UnaryExpression':
    case 'UpdateExpression':
    case 'AwaitExpression':
    case 'YieldExpression':
    case 'ReturnStatement':
    case 'ThrowStatement':
      if (node.argument) {
        stack.push(node.argument);
      }
      break;

    case 'IfStatement':
    case 'ConditionalExpression':
      if (node.alternate) {
        stack.push(node.alternate);
      }
      if (node.consequent) {
        stack.push(node.consequent);
      }
      if (node.test) {
        stack.push(node.test);
      }
      break;

    case 'VariableDeclaration':
      pushNodesReverse(node.declarations, stack);
      break;

    case 'VariableDeclarator':
      if (node.init) {
        stack.push(node.init);
      }
      if (node.id) {
        stack.push(node.id);
      }
      break;

    case 'FunctionDeclaration':
    case 'FunctionExpression':
    case 'ArrowFunctionExpression':
      if (node.body) {
        stack.push(node.body);
      }
      pushNodesReverse(node.params, stack);
      if (node.id) {
        stack.push(node.id);
      }
      break;

    case 'ClassDeclaration':
    case 'ClassExpression':
      if (node.body) {
        stack.push(node.body);
      }
      if (node.superClass) {
        stack.push(node.superClass);
      }
      if (node.id) {
        stack.push(node.id);
      }
      pushNodesReverse(node.decorators, stack);
      break;

    case 'Property':
    case 'PropertyDefinition':
    case 'MethodDefinition':
      if (node.value) {
        stack.push(node.value);
      }
      if (node.key) {
        stack.push(node.key);
      }
      if (node.type !== 'Property') {
        pushNodesReverse(node.decorators, stack);
      }
      break;

    case 'ObjectExpression':
      pushNodesReverse(node.properties, stack);
      break;

    case 'ArrayExpression':
      pushNodesReverse(node.elements, stack);
      break;

    case 'TemplateLiteral':
      pushNodesReverse(node.expressions, stack);
      break;

    case 'TaggedTemplateExpression':
      if (node.quasi) {
        stack.push(node.quasi);
      }
      if (node.tag) {
        stack.push(node.tag);
      }
      break;

    default: {
      // Prune non-executable TypeScript type-only AST nodes (e.g. TSTypeAnnotation, TSTypeReference, etc.)
      if (isTypeOnlyTypeScriptNode(node.type)) {
        break;
      }

      const keys = visitorKeys[node.type];
      if (!keys) {
        break;
      }

      for (let i = keys.length - 1; i >= 0; i--) {
        const child = (
          node as unknown as Record<string, Node | (Node | null)[] | null | undefined>
        )[keys[i]];
        if (!child) {
          continue;
        }

        if (Array.isArray(child)) {
          pushNodesReverse(child, stack);
        } else {
          stack.push(child);
        }
      }
      break;
    }
  }
}

/**
 * Traverses ESTree AST nodes in post-order (bottom-up) without recursion.
 *
 * @param root The root AST node to traverse.
 * @param visit Callback invoked on each AST node in post-order.
 */
export function traversePostOrder(
  root: Node,
  visit: (node: Node, context: TraversalContext) => void,
): void {
  const stack: (Node | null)[] = [root];
  let functionDepth = 0;
  let classDepth = 0;
  const functionStack: Node[] = [];

  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) {
      break;
    }
    if (current === null) {
      const node = stack.pop();
      if (!node) {
        continue;
      }
      const type = node.type;
      if (isFunction(type)) {
        functionDepth--;
        functionStack.pop();
      } else if (isClass(type)) {
        classDepth--;
      }
      visit(node, {
        functionDepth,
        classDepth,
        parentFunc: functionStack[functionStack.length - 1],
      });
      continue;
    }

    stack.push(current);
    stack.push(null);
    const type = current.type;
    if (isFunction(type)) {
      functionDepth++;
      functionStack.push(current);
    } else if (isClass(type)) {
      classDepth++;
    }

    pushChildNodes(current, stack);
  }
}
