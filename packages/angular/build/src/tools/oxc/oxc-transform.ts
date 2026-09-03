/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { DecodedSourceMap } from '@ampproject/remapping';
import { needsLinking } from '@angular/compiler-cli/linker';
import type { BindingIdentifier, Class, Node } from '@oxc-project/types';
import { MagicString } from 'magic-string';
import { parseSync } from 'oxc-parser';
import { OxcLinker } from '../angular/linker/oxc-linker';
import { traversePostOrder } from './traversal';

export interface OxcTransformOptions {
  sourcemap?: boolean;
  sideEffects?: boolean;
  topLevelSafeMode?: boolean;
  pureAnnotate?: boolean;
  link?: boolean;
  jit?: boolean;
  advancedOptimizations?: boolean;
}

/**
 * A set of constructor names that are considered to be side-effect free.
 */
const sideEffectFreeConstructors = new Set<string>(['InjectionToken']);

/**
 * A set of TypeScript helper function names used by the helper name matcher utility function.
 */
const tslibHelpers = new Set<string>([
  '__extends',
  '__assign',
  '__rest',
  '__decorate',
  '__param',
  '__esDecorate',
  '__runInitializers',
  '__propKey',
  '__setFunctionName',
  '__metadata',
  '__awaiter',
  '__generator',
  '__exportStar',
  '__values',
  '__read',
  '__privateGet',
  '__privateSet',
  '__privateMethod',
  '__addDisposableResource',
  '__disposeResources',
]);

/**
 * Determines whether an identifier name matches one of the TypeScript helper function names.
 *
 * @param name The identifier name to check.
 * @returns True if the name matches a TypeScript helper name; otherwise, false.
 */
function isTslibHelperName(name: string): boolean {
  const nameParts = name.split('$');
  const originalName = nameParts[0];

  if (nameParts.length > 2 || (nameParts.length === 2 && !/^\d+$/.test(nameParts[1]))) {
    return false;
  }

  return tslibHelpers.has(originalName);
}

/**
 * A set of Babel helper function names that are intended to cause side effects.
 */
const babelHelpers = new Set<string>(['_defineProperty']);

/**
 * Determines whether an identifier name matches one of the Babel helper function names.
 *
 * @param name The identifier name to check.
 * @returns True if the name matches a Babel helper name; otherwise, false.
 */
function isBabelHelperName(name: string): boolean {
  return babelHelpers.has(name);
}

/**
 * A set of Angular static properties that should be wrapped in pure IIFE statements.
 */
const angularStaticsToWrap = new Set([
  'ɵcmp',
  'ɵdir',
  'ɵfac',
  'ɵinj',
  'ɵmod',
  'ɵpipe',
  'ɵprov',
  'INJECTOR_KEY',
]);

/**
 * A set of Angular metadata decorator functions that can be elided.
 */
const angularMetadataFunctions = new Set([
  'ɵsetClassMetadata',
  'ɵsetClassMetadataAsync',
  'ɵsetClassDebugInfo',
]);

/**
 * A map of static properties and their matcher predicate functions to check if they
 * can be safely elided from class declarations.
 */
const angularStaticsToElide: Record<string, (node: Node) => boolean> = {
  'ctorParameters'(node) {
    return node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression';
  },
  'decorators'(node) {
    return node.type === 'ArrayExpression';
  },
  'propDecorators'(node) {
    return node.type === 'ObjectExpression';
  },
};

/**
 * Determines whether an AST node is considered safe for pure evaluation (side-effect free).
 *
 * @param node The AST node to check.
 * @returns True if the node is side-effect free; otherwise, false.
 */
function isPure(node: Node): boolean {
  switch (node.type) {
    case 'Identifier':
    case 'Literal':
      return true;
    case 'BinaryExpression':
    case 'LogicalExpression':
      return isPure(node.left) && isPure(node.right);
    case 'UnaryExpression':
      return isPure(node.argument);
    case 'MemberExpression':
      return isPure(node.object) && (!node.computed || isPure(node.property));
    case 'ObjectExpression':
      return node.properties.every((p) => p.type === 'Property' && isPure(p.value));
    case 'ArrayExpression':
      return node.elements.every((e) => !e || isPure(e));
    case 'ParenthesizedExpression':
      return isPure(node.expression);
    default:
      return false;
  }
}

/**
 * Recursively unwraps any ParenthesizedExpression wrapper nodes to get the inner expression.
 *
 * @param node The potentially parenthesized AST node.
 * @returns The inner non-parenthesized AST node.
 */
function unwrapParentheses(node: Node): Node {
  while (node && node.type === 'ParenthesizedExpression') {
    node = node.expression;
  }

  return node;
}

/**
 * Determines whether a class static property assignment is safe to be wrapped in a pure IIFE.
 *
 * @param propertyName The name of the property.
 * @param assignmentValue The AST node representing the value assigned.
 * @param code The source code of the file.
 * @returns True if the property can be wrapped safely; otherwise, false.
 */
function canWrapProperty(propertyName: string, assignmentValue: Node, code: string): boolean {
  if (angularStaticsToWrap.has(propertyName)) {
    return true;
  }

  const prefix = code.substring(Math.max(0, assignmentValue.start - 100), assignmentValue.start);
  if (/(\/\*[\s\S]*?(?:@__PURE__|#__PURE__|@pureOrBreakMyCode)[\s\S]*?\*\/)\s*$/.test(prefix)) {
    return true;
  }

  return isPure(assignmentValue);
}

/**
 * Analyzes static properties inside a class body to determine if the class has any
 * side-effecting static property initializers.
 *
 * @param classNode The Class AST node.
 * @param code The source code of the file.
 * @returns True if the class static properties are pure and can be wrapped; otherwise, false.
 */
function analyzeClassStaticProperties(classNode: Node, code: string): boolean {
  let shouldWrap = false;
  const body = (classNode as Class).body.body;
  for (const element of body) {
    if (element.type === 'PropertyDefinition') {
      if (!element.static) {
        continue;
      }

      const key = element.key;
      const value = element.value;
      if (key.type === 'Identifier' && (!value || canWrapProperty(key.name, value, code))) {
        shouldWrap = true;
      } else {
        shouldWrap = false;
        break;
      }
    } else if (element.type === 'StaticBlock') {
      const blockBody = element.body;
      if (blockBody.length === 0) {
        continue;
      }
      if (blockBody.length > 1) {
        shouldWrap = false;
        break;
      }
      const expressionStatement = blockBody[0];
      if (expressionStatement && expressionStatement.type === 'ExpressionStatement') {
        const assignment = expressionStatement.expression;
        if (
          assignment &&
          assignment.type === 'AssignmentExpression' &&
          assignment.left.type === 'MemberExpression'
        ) {
          const left = assignment.left;
          if (left.object.type === 'ThisExpression' && left.property.type === 'Identifier') {
            if (canWrapProperty(left.property.name, assignment.right, code)) {
              shouldWrap = true;
              continue;
            }
          }
        }
      }
      shouldWrap = false;
      break;
    }
  }

  return shouldWrap;
}

/**
 * Executes a single-pass optimized transformation using oxc-parser and magic-string.
 * Performs typescript enum wrapping, static class members elision/wrapping, angular metadata elision,
 * and top-level pure function annotations.
 *
 * @param filename The absolute path of the file being transformed.
 * @param code The string source content of the file.
 * @param options Configuration options specifying which optimization steps to run.
 * @returns The transformed code string and an optional source map.
 */
// eslint-disable-next-line max-lines-per-function
export function transform(filename: string, code: string, options: OxcTransformOptions) {
  const { program } = parseSync(filename, code, { range: true });
  const source = new MagicString(code);

  const shouldLink = options.link && needsLinking(filename, code);
  const linker = shouldLink ? new OxcLinker(filename, code, options.jit) : undefined;

  const advancedOptimizations = options.advancedOptimizations ?? true;
  const sideEffectFree = options.sideEffects === false;
  const topLevelSafeMode = options.topLevelSafeMode ?? false;
  const wrapDecorators = sideEffectFree;
  const pureAnnotate = options.pureAnnotate ?? true;

  /**
   * Scans backwards from the specified start index to check if a pure comment (e.g. `/*@__PURE__*\/`)
   * already precedes the node.
   *
   * @param start The index where the node starts.
   * @returns True if a pure comment is already present; otherwise, false.
   */
  function hasPureComment(start: number): boolean {
    let i = start - 1;
    while (i >= 0 && /\s/.test(code[i])) {
      i--;
    }
    if (i < 1 || code[i] !== '/' || code[i - 1] !== '*') {
      return false;
    }
    const commentEnd = i + 1;
    const commentStart = code.lastIndexOf('/*', commentEnd);
    if (commentStart === -1) {
      return false;
    }
    const commentContent = code.substring(commentStart + 2, commentEnd - 2);

    return commentContent.includes('@__PURE__') || commentContent.includes('#__PURE__');
  }

  const editedRanges: { start: number; end: number }[] = [];

  /**
   * Records a range in the source code that has been modified, preventing subsequent nested mutations.
   *
   * @param start The start index of the modified range.
   * @param end The end index of the modified range.
   */
  function markEdited(start: number, end: number) {
    editedRanges.push({ start, end });
  }

  /**
   * Checks if the specified range falls inside an already modified section of code.
   *
   * @param start The start index of the range.
   * @param end The end index of the range.
   * @returns True if the range is already edited; otherwise, false.
   */
  function isAlreadyEdited(start: number, end: number): boolean {
    return editedRanges.some((r) => start >= r.start && end <= r.end);
  }

  /**
   * Scans and rewrites TypeScript emitted enum declarations in the statement block.
   * Wraps enum statements inside a pure IIFE assignable directly to the enum variable.
   *
   * @param body The array of statement AST nodes to process.
   */
  function adjustTypeScriptEnumsInStatements(body: Node[]) {
    for (let i = 0; i < body.length - 1; i++) {
      const statement = body[i];
      let declStatement = statement;
      if (
        statement.type === 'ExportNamedDeclaration' &&
        statement.declaration?.type === 'VariableDeclaration'
      ) {
        declStatement = statement.declaration;
      }

      if (
        declStatement.type !== 'VariableDeclaration' ||
        declStatement.kind !== 'var' ||
        declStatement.declarations.length !== 1
      ) {
        continue;
      }
      const decl = declStatement.declarations[0];
      if (decl.init || decl.id.type !== 'Identifier') {
        continue;
      }

      const nextStatement = body[i + 1];
      if (nextStatement.type !== 'ExpressionStatement') {
        continue;
      }

      const nextExpr = unwrapParentheses(nextStatement.expression);
      if (nextExpr.type !== 'CallExpression' || nextExpr.arguments.length !== 1) {
        continue;
      }

      const arg = unwrapParentheses(nextExpr.arguments[0]);
      if (arg.type !== 'LogicalExpression' || arg.operator !== '||') {
        continue;
      }

      const argLeft = unwrapParentheses(arg.left);
      if (argLeft.type !== 'Identifier' || argLeft.name !== decl.id.name) {
        continue;
      }

      const rightCallArgument = unwrapParentheses(arg.right);
      if (rightCallArgument.type !== 'AssignmentExpression') {
        continue;
      }

      const callee = unwrapParentheses(nextExpr.callee);
      if (
        callee.type !== 'FunctionExpression' ||
        callee.params.length !== 1 ||
        !callee.body ||
        callee.body.type !== 'BlockStatement'
      ) {
        continue;
      }

      const param = callee.params[0];
      if (param.type !== 'Identifier') {
        continue;
      }
      const paramName = (param as BindingIdentifier).name;

      // Check if all statements in body are pure assignments
      let hasElements = false;
      let allPure = true;
      for (const enumStatement of callee.body.body) {
        if (enumStatement.type !== 'ExpressionStatement') {
          allPure = false;
          break;
        }

        const enumValueAssignment = unwrapParentheses(enumStatement.expression);
        if (
          enumValueAssignment.type !== 'AssignmentExpression' ||
          !isPure(enumValueAssignment.right)
        ) {
          allPure = false;
          break;
        }

        hasElements = true;
      }

      if (!allPure || !hasElements) {
        continue;
      }

      // 1. Remove leading/trailing characters/parentheses of the expression statement
      source.remove(nextStatement.start, nextExpr.start);
      source.remove(nextExpr.end, nextStatement.end);
      markEdited(nextStatement.start, nextStatement.end);

      // 2. Add return statement inside IIFE body
      source.appendRight(callee.body.end - 1, `; return ${paramName};`);

      // 3. Remove `Name = ` assignment in arguments if it's a simple identifier
      if (rightCallArgument.left.type === 'Identifier') {
        let replacement = code.substring(
          rightCallArgument.right.start,
          rightCallArgument.right.end,
        );
        if (unwrapParentheses(rightCallArgument.right).type === 'AssignmentExpression') {
          replacement = `(${replacement})`;
        }
        source.overwrite(arg.right.start, arg.right.end, replacement);
        markEdited(arg.right.start, arg.right.end);
      }

      // 4. Move IIFE to the var initializer
      source.move(nextExpr.start, nextExpr.end, decl.id.end);
      source.appendLeft(decl.id.end, ' = /*#__PURE__*/ ');
    }
  }

  /**
   * Scans and rewrites static class member initializers in the statement block.
   * Groups externalized class static assignments into pure wrappers or elides them when safe.
   *
   * @param body The array of statement AST nodes to process.
   */
  function adjustStaticMembersInStatements(body: Node[]) {
    for (let i = 0; i < body.length; i++) {
      const statement = body[i];
      let classNode: Node | null = null;
      let isExportDefault = false;
      let isExportNamed = false;
      let isVariableClass = false;
      let classIdName = '';
      if (statement.type === 'ClassDeclaration') {
        classNode = statement;
        classIdName = classNode.id?.name || '';
      } else if (
        statement.type === 'ExportNamedDeclaration' &&
        statement.declaration?.type === 'ClassDeclaration'
      ) {
        classNode = statement.declaration;
        classIdName = classNode.id?.name || '';
        isExportNamed = true;
      } else if (
        statement.type === 'ExportDefaultDeclaration' &&
        statement.declaration?.type === 'ClassDeclaration'
      ) {
        classNode = statement.declaration;
        classIdName = classNode.id?.name || '';
        isExportDefault = true;
      } else if (statement.type === 'VariableDeclaration' && statement.declarations.length === 1) {
        const decl = statement.declarations[0];
        if (decl.init && decl.init.type === 'ClassExpression' && decl.id.type === 'Identifier') {
          classNode = decl.init;
          classIdName = decl.id.name;
          isVariableClass = true;
        }
      }

      if (!classNode || !classIdName) {
        continue;
      }

      const wrapStatementPaths: { statement: Node; type: 'wrap' | 'decorate' | 'elide' }[] = [];
      let hasPotentialSideEffects = false;

      for (let j = i + 1; j < body.length; j++) {
        const nextStatement = body[j];
        if (nextStatement.type !== 'ExpressionStatement') {
          break;
        }

        const nextExpression = nextStatement.expression;

        // Case 1: __decorate(...)
        if (nextExpression.type === 'CallExpression') {
          if (
            nextExpression.callee.type !== 'Identifier' ||
            nextExpression.callee.name !== '__decorate'
          ) {
            break;
          }

          if (wrapDecorators) {
            wrapStatementPaths.push({ statement: nextStatement, type: 'decorate' });
          } else {
            hasPotentialSideEffects = true;
          }
          continue;
        }

        // Case 2: AssignmentExpression
        if (nextExpression.type !== 'AssignmentExpression') {
          break;
        }

        const left = nextExpression.left;

        if (left.type === 'Identifier') {
          if (
            left.name !== classIdName ||
            nextExpression.right.type !== 'CallExpression' ||
            nextExpression.right.callee.type !== 'Identifier' ||
            nextExpression.right.callee.name !== '__decorate'
          ) {
            break;
          }

          if (wrapDecorators) {
            wrapStatementPaths.push({ statement: nextStatement, type: 'decorate' });
          } else {
            hasPotentialSideEffects = true;
          }
          continue;
        }

        if (
          left.type !== 'MemberExpression' ||
          left.object.type !== 'Identifier' ||
          left.object.name !== classIdName ||
          left.property.type !== 'Identifier'
        ) {
          break;
        }

        const propertyName = left.property.name;
        const assignmentValue = nextExpression.right;

        if (angularStaticsToElide[propertyName]?.(assignmentValue)) {
          wrapStatementPaths.push({ statement: nextStatement, type: 'elide' });
        } else if (canWrapProperty(propertyName, assignmentValue, code)) {
          wrapStatementPaths.push({ statement: nextStatement, type: 'wrap' });
        } else {
          hasPotentialSideEffects = true;
        }
      }

      // Check class body static properties
      const shouldWrapClassStaticProperties = analyzeClassStaticProperties(classNode, code);

      // Perform elisions immediately
      for (const item of wrapStatementPaths) {
        if (item.type === 'elide') {
          source.remove(item.statement.start, item.statement.end);
          markEdited(item.statement.start, item.statement.end);
        }
      }

      const activeWrapPaths = wrapStatementPaths.filter(
        (p) => p.type === 'wrap' || p.type === 'decorate',
      );

      if (
        !hasPotentialSideEffects &&
        (activeWrapPaths.length > 0 || shouldWrapClassStaticProperties)
      ) {
        const lastStatement =
          activeWrapPaths.length > 0
            ? activeWrapPaths[activeWrapPaths.length - 1].statement
            : classNode;

        if (isExportDefault) {
          // 1. Remove `export default `
          source.overwrite(statement.start, classNode.start, '');
          // 2. Wrap in IIFE
          source.appendRight(classNode.start, `let ${classIdName} = /*#__PURE__*/ (() => {\n`);
          source.appendLeft(
            lastStatement.end,
            `\nreturn ${classIdName};\n})();\nexport { ${classIdName} as default };`,
          );
        } else if (isExportNamed) {
          // 1. Export is kept, turn `class` into `let ClassName = IIFE`
          source.appendRight(classNode.start, `let ${classIdName} = /*#__PURE__*/ (() => {\n`);
          source.appendLeft(lastStatement.end, `\nreturn ${classIdName};\n})();`);
        } else if (isVariableClass) {
          // 2. Wrap class inside init: `(() => { let ClassName = class ClassName {}; return ClassName; })()`
          source.appendRight(classNode.start, `/*#__PURE__*/ (() => {\nlet ${classIdName} = `);
          const terminator = activeWrapPaths.length === 0 ? ';' : '';
          const iifeClosing = activeWrapPaths.length === 0 ? '})()' : '})();';
          source.appendLeft(
            lastStatement.end,
            `${terminator}\nreturn ${classIdName};\n${iifeClosing}`,
          );
        } else {
          // Standard ClassDeclaration
          source.appendRight(classNode.start, `let ${classIdName} = /*#__PURE__*/ (() => {\n`);
          source.appendLeft(lastStatement.end, `\nreturn ${classIdName};\n})();`);
        }

        markEdited(statement.start, lastStatement.end);

        // Fast-forward outer loop index to skip the statements we wrapped
        i += wrapStatementPaths.length;
      } else if (isExportDefault && !hasPotentialSideEffects) {
        // Splitting default export even when not wrapped
        source.overwrite(statement.start, classNode.start, '');
        source.appendLeft(classNode.end, `\nexport { ${classIdName} as default };`);
        markEdited(statement.start, classNode.end);
      }
    }
  }

  traversePostOrder(program, (node, { functionDepth, classDepth, parentFunc }) => {
    switch (node.type) {
      case 'Program':
      case 'BlockStatement':
        if (advancedOptimizations) {
          adjustTypeScriptEnumsInStatements(node.body);
          adjustStaticMembersInStatements(node.body);
        }
        break;

      case 'CallExpression': {
        if (isAlreadyEdited(node.start, node.end)) {
          return;
        }

        if (linker) {
          const linkedCode = linker.linkCallExpression(node);
          if (linkedCode !== undefined) {
            source.overwrite(node.start, node.end, linkedCode);
            markEdited(node.start, node.end);

            return;
          }
        }

        if (!advancedOptimizations) {
          return;
        }

        // 1. Elide Angular Metadata check
        let calleeName: string | undefined;
        if (node.callee.type === 'Identifier') {
          calleeName = node.callee.name;
        } else if (
          node.callee.type === 'MemberExpression' &&
          node.callee.property.type === 'Identifier'
        ) {
          calleeName = node.callee.property.name;
        }

        if (calleeName && angularMetadataFunctions.has(calleeName)) {
          if (
            parentFunc &&
            (parentFunc.type === 'FunctionExpression' ||
              parentFunc.type === 'ArrowFunctionExpression')
          ) {
            source.overwrite(node.start, node.end, 'void 0');
            markEdited(node.start, node.end);

            return;
          }
        }

        // 2. Mark Top-Level Pure Functions check
        if (!pureAnnotate || functionDepth > 0 || classDepth > 0 || topLevelSafeMode) {
          return;
        }

        const callee = unwrapParentheses(node.callee);
        if (
          (callee.type === 'FunctionExpression' || callee.type === 'ArrowFunctionExpression') &&
          node.arguments.length !== 0
        ) {
          return;
        }

        if (
          callee.type === 'Identifier' &&
          (isTslibHelperName(callee.name) || isBabelHelperName(callee.name))
        ) {
          return;
        }

        if (!hasPureComment(node.start)) {
          source.appendLeft(node.start, '/*#__PURE__*/ ');
        }
        break;
      }

      case 'NewExpression': {
        if (
          !advancedOptimizations ||
          !pureAnnotate ||
          functionDepth > 0 ||
          classDepth > 0 ||
          isAlreadyEdited(node.start, node.end)
        ) {
          return;
        }

        if (!topLevelSafeMode) {
          if (!hasPureComment(node.start)) {
            source.appendLeft(node.start, '/*#__PURE__*/ ');
          }

          return;
        }

        const newCallee = node.callee;
        if (newCallee.type === 'Identifier' && sideEffectFreeConstructors.has(newCallee.name)) {
          if (!hasPureComment(node.start)) {
            source.appendLeft(node.start, '/*#__PURE__*/ ');
          }
        }
        break;
      }
    }
  });

  let map: DecodedSourceMap | undefined;
  if (options.sourcemap) {
    const rawMap = source.generateDecodedMap({ hires: 'boundary', source: filename });
    map = { ...rawMap, version: 3 };
  }

  return {
    code: source.toString(),
    map,
  };
}
