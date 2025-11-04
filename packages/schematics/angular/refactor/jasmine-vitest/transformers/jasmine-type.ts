/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/**
 * @fileoverview This file contains a transformer that migrates Jasmine type definitions to
 * their Vitest equivalents. It handles the conversion of types like `jasmine.Spy` and
 * `jasmine.SpyObj` to Vitest's `Mock` and `MockedObject` types, and ensures that the
 * necessary `vitest` imports are added to the file.
 */

import ts from '../../../third_party/github.com/Microsoft/TypeScript/lib/typescript';
import { addVitestTypeImport } from '../utils/ast-helpers';
import { RefactorContext } from '../utils/refactor-context';

export function transformJasmineTypes(
  node: ts.Node,
  { sourceFile, reporter, pendingVitestTypeImports }: RefactorContext,
): ts.Node {
  const typeNameNode = ts.isTypeReferenceNode(node) ? node.typeName : node;
  if (
    !ts.isQualifiedName(typeNameNode) ||
    !ts.isIdentifier(typeNameNode.left) ||
    typeNameNode.left.text !== 'jasmine'
  ) {
    return node;
  }

  const jasmineTypeName = typeNameNode.right.text;

  switch (jasmineTypeName) {
    case 'Spy': {
      const vitestTypeName = 'Mock';
      reporter.reportTransformation(
        sourceFile,
        node,
        `Transformed type \`jasmine.Spy\` to \`${vitestTypeName}\`.`,
      );
      addVitestTypeImport(pendingVitestTypeImports, vitestTypeName);

      return ts.factory.createIdentifier(vitestTypeName);
    }
    case 'SpyObj': {
      const vitestTypeName = 'MockedObject';
      reporter.reportTransformation(
        sourceFile,
        node,
        `Transformed type \`jasmine.SpyObj\` to \`${vitestTypeName}\`.`,
      );
      addVitestTypeImport(pendingVitestTypeImports, vitestTypeName);

      if (ts.isTypeReferenceNode(node)) {
        return ts.factory.updateTypeReferenceNode(
          node,
          ts.factory.createIdentifier(vitestTypeName),
          node.typeArguments,
        );
      }

      return ts.factory.createIdentifier(vitestTypeName);
    }
    case 'Any':
      reporter.reportTransformation(
        sourceFile,
        node,
        `Transformed type \`jasmine.Any\` to \`any\`.`,
      );

      return ts.factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword);
    case 'ObjectContaining': {
      const typeArguments = ts.isTypeReferenceNode(node) ? node.typeArguments : undefined;
      if (typeArguments && typeArguments.length > 0) {
        reporter.reportTransformation(
          sourceFile,
          node,
          `Transformed type \`jasmine.ObjectContaining\` to \`Partial\`.`,
        );

        return ts.factory.createTypeReferenceNode('Partial', typeArguments);
      }

      reporter.reportTransformation(
        sourceFile,
        node,
        `Transformed type \`jasmine.ObjectContaining\` to \`object\`.`,
      );

      return ts.factory.createKeywordTypeNode(ts.SyntaxKind.ObjectKeyword);
    }
    case 'DoneFn':
      reporter.reportTransformation(
        sourceFile,
        node,
        'Transformed type `jasmine.DoneFn` to `() => void`.',
      );

      return ts.factory.createFunctionTypeNode(
        undefined,
        [],
        ts.factory.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword),
      );
  }

  return node;
}
