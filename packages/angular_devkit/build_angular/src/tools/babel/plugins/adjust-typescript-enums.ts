/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { NodePath, PluginObj, types } from '@babel/core';
import annotateAsPure from '@babel/helper-annotate-as-pure';

/**
 * Provides one or more keywords that if found within the content of a source file indicate
 * that this plugin should be used with a source file.
 *
 * @returns An a string iterable containing one or more keywords.
 */
export function getKeywords(): Iterable<string> {
  return ['var'];
}

/**
 * A babel plugin factory function for adjusting TypeScript emitted enums.
 *
 * @returns A babel plugin object instance.
 */
export default function (): PluginObj {
  return {
    visitor: {
      VariableDeclaration(path: NodePath<types.VariableDeclaration>) {
        const { parentPath, node } = path;
        if (node.kind !== 'var' || node.declarations.length !== 1) {
          return;
        }

        const declaration = path.get('declarations')[0];
        if (declaration.node.init) {
          return;
        }

        const declarationId = declaration.node.id;
        if (!types.isIdentifier(declarationId)) {
          return;
        }

        const hasExport =
          parentPath.isExportNamedDeclaration() || parentPath.isExportDefaultDeclaration();
        const origin = hasExport ? parentPath : path;
        const nextStatement = origin.getSibling(+(origin.key ?? 0) + 1);
        if (!nextStatement.isExpressionStatement()) {
          return;
        }

        const nextExpression = nextStatement.get('expression');
        if (!nextExpression.isCallExpression() || nextExpression.node.arguments.length !== 1) {
          return;
        }

        const enumCallArgument = nextExpression.get('arguments')[0];
        if (!enumCallArgument.isLogicalExpression({ operator: '||' })) {
          return;
        }

        const leftCallArgument = enumCallArgument.get('left');
        const rightCallArgument = enumCallArgument.get('right');

        // Check if identifiers match var declaration
        if (
          !leftCallArgument.isIdentifier() ||
          !nextExpression.scope.bindingIdentifierEquals(
            leftCallArgument.node.name,
            declarationId,
          ) ||
          !rightCallArgument.isAssignmentExpression()
        ) {
          return;
        }

        const enumCallee = nextExpression.get('callee');
        if (!enumCallee.isFunctionExpression() || enumCallee.node.params.length !== 1) {
          return;
        }

        const parameterId = enumCallee.get('params')[0];
        if (!parameterId.isIdentifier()) {
          return;
        }

        // Check if all enum member values are pure.
        // If not, leave as-is due to potential side efects
        let hasElements = false;
        for (const enumStatement of enumCallee.get('body').get('body')) {
          if (!enumStatement.isExpressionStatement()) {
            return;
          }

          const enumValueAssignment = enumStatement.get('expression');
          if (
            !enumValueAssignment.isAssignmentExpression() ||
            !enumValueAssignment.get('right').isPure()
          ) {
            return;
          }

          hasElements = true;
        }

        // If there are no enum elements then there is nothing to wrap
        if (!hasElements) {
          return;
        }

        // Update right-side of initializer call argument to remove redundant assignment
        if (rightCallArgument.get('left').isIdentifier()) {
          rightCallArgument.replaceWith(rightCallArgument.get('right'));
        }

        // Add a return statement to the enum initializer block
        enumCallee
          .get('body')
          .node.body.push(types.returnStatement(types.cloneNode(parameterId.node)));

        // Remove existing enum initializer
        const enumInitializer = nextExpression.node;
        nextExpression.remove();

        annotateAsPure(enumInitializer);

        // Add the wrapped enum initializer directly to the variable declaration
        declaration.get('init').replaceWith(enumInitializer);
      },
    },
  };
}
