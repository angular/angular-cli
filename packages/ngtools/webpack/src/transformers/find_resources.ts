/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';
import { collectDeepNodes } from './ast_helpers';
import { getResourceUrl } from './replace_resources';

export function findResources(sourceFile: ts.SourceFile): string[] {
  const resources: string[] = [];
  const decorators = collectDeepNodes<ts.Decorator>(sourceFile, ts.SyntaxKind.Decorator);

  for (const node of decorators) {
    if (!ts.isCallExpression(node.expression)) {
      continue;
    }

    const decoratorFactory = node.expression;
    const args = decoratorFactory.arguments;
    if (args.length !== 1 || !ts.isObjectLiteralExpression(args[0])) {
      // Unsupported component metadata
      continue;
    }

    ts.visitNodes(
      (args[0] as ts.ObjectLiteralExpression).properties,
      (node: ts.ObjectLiteralElementLike) => {
        if (!ts.isPropertyAssignment(node) || ts.isComputedPropertyName(node.name)) {
          return node;
        }

        const name = node.name.text;
        switch (name) {
          case 'templateUrl':
            const url = getResourceUrl(node.initializer);

            if (url) {
              resources.push(url);
            }
            break;

          case 'styleUrls':
            if (!ts.isArrayLiteralExpression(node.initializer)) {
              return node;
            }

            ts.visitNodes(node.initializer.elements, (node: ts.Expression) => {
              const url = getResourceUrl(node);

              if (url) {
                resources.push(url);
              }

              return node;
            });
            break;
        }

        return node;
      },
    );
  }

  return resources;
}
