/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import ts from 'typescript';

/**
 * Creates a TypeScript Transformer to process Worker and SharedWorker entry points and transform
 * the URL instances to reference the built and bundled worker code. This uses a callback process
 * similar to the component stylesheets to allow the main esbuild plugin to process files as needed.
 * Unsupported worker expressions will be left in their origin form.
 * @param getTypeChecker A function that returns a TypeScript TypeChecker instance for the program.
 * @returns A TypeScript transformer factory.
 */
export function createWorkerTransformer(
  fileProcessor: (file: string, importer: string) => string,
): ts.TransformerFactory<ts.SourceFile> {
  return (context: ts.TransformationContext) => {
    const nodeFactory = context.factory;

    const visitNode: ts.Visitor = (node: ts.Node) => {
      // Check if the node is a valid new expression for a Worker or SharedWorker
      // TODO: Add global scope check
      if (
        !ts.isNewExpression(node) ||
        !ts.isIdentifier(node.expression) ||
        (node.expression.text !== 'Worker' && node.expression.text !== 'SharedWorker')
      ) {
        // Visit child nodes of non-Worker expressions
        return ts.visitEachChild(node, visitNode, context);
      }

      // Worker should have atleast one argument but not more than two
      if (!node.arguments || node.arguments.length < 1 || node.arguments.length > 2) {
        return node;
      }

      // First argument must be a new URL expression
      const workerUrlNode = node.arguments[0];
      // TODO: Add global scope check
      if (
        !ts.isNewExpression(workerUrlNode) ||
        !ts.isIdentifier(workerUrlNode.expression) ||
        workerUrlNode.expression.text !== 'URL'
      ) {
        return node;
      }

      // URL must have 2 arguments
      if (!workerUrlNode.arguments || workerUrlNode.arguments.length !== 2) {
        return node;
      }

      // URL arguments must be a string and then `import.meta.url`
      if (
        !ts.isStringLiteralLike(workerUrlNode.arguments[0]) ||
        !ts.isPropertyAccessExpression(workerUrlNode.arguments[1]) ||
        !ts.isMetaProperty(workerUrlNode.arguments[1].expression) ||
        workerUrlNode.arguments[1].name.text !== 'url'
      ) {
        return node;
      }

      const filePath = workerUrlNode.arguments[0].text;
      const importer = node.getSourceFile().fileName;

      // Process the file
      const replacementPath = fileProcessor(filePath, importer);

      // Update if the path changed
      if (replacementPath !== filePath) {
        return nodeFactory.updateNewExpression(
          node,
          node.expression,
          node.typeArguments,
          // Update Worker arguments
          ts.setTextRange(
            nodeFactory.createNodeArray(
              [
                nodeFactory.updateNewExpression(
                  workerUrlNode,
                  workerUrlNode.expression,
                  workerUrlNode.typeArguments,
                  // Update URL arguments
                  ts.setTextRange(
                    nodeFactory.createNodeArray(
                      [
                        nodeFactory.createStringLiteral(replacementPath),
                        workerUrlNode.arguments[1],
                      ],
                      workerUrlNode.arguments.hasTrailingComma,
                    ),
                    workerUrlNode.arguments,
                  ),
                ),
                // Use the second Worker argument (options) if present.
                // Otherwise create a default options object for module Workers.
                node.arguments[1] ??
                  nodeFactory.createObjectLiteralExpression([
                    nodeFactory.createPropertyAssignment(
                      'type',
                      nodeFactory.createStringLiteral('module'),
                    ),
                  ]),
              ],
              node.arguments.hasTrailingComma,
            ),
            node.arguments,
          ),
        );
      } else {
        return node;
      }
    };

    return (sourceFile) => {
      // Skip transformer if there are no Workers
      if (!sourceFile.text.includes('Worker')) {
        return sourceFile;
      }

      return ts.visitEachChild(sourceFile, visitNode, context);
    };
  };
}
