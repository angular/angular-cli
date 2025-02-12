/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import assert from 'node:assert';
import { relative } from 'node:path/posix';
import ts from 'typescript';

/**
 * A transformer factory that adds a property to the lazy-loaded route object.
 * This property is used to allow for the retrieval of the module path during SSR.
 *
 * @param compilerOptions The compiler options.
 * @param compilerHost The compiler host.
 * @returns A transformer factory.
 *
 * @example
 * **Before:**
 * ```ts
 * const routes: Routes = [
 *   {
 *     path: 'lazy',
 *     loadChildren: () => import('./lazy/lazy.module').then(m => m.LazyModule)
 *   }
 * ];
 * ```
 *
 * **After:**
 * ```ts
 * const routes: Routes = [
 *   {
 *     path: 'lazy',
 *     loadChildren: () => import('./lazy/lazy.module').then(m => m.LazyModule),
 *     ...(typeof ngServerMode !== "undefined" && ngServerMode ? { ɵentryName: "./lazy/lazy.module.ts" }: {})
 *   }
 * ];
 * ```
 */
export function lazyRoutesTransformer(
  compilerOptions: ts.CompilerOptions,
  compilerHost: ts.CompilerHost,
): ts.TransformerFactory<ts.SourceFile> {
  const moduleResolutionCache = compilerHost.getModuleResolutionCache?.();
  assert(
    typeof compilerOptions.basePath === 'string',
    'compilerOptions.basePath should be a string.',
  );
  const basePath = compilerOptions.basePath;

  return (context: ts.TransformationContext) => {
    const factory = context.factory;

    const visitor = (node: ts.Node): ts.Node => {
      if (!ts.isObjectLiteralExpression(node)) {
        // Not an object literal, so skip it.
        return ts.visitEachChild(node, visitor, context);
      }

      const loadFunction = getLoadComponentOrChildrenProperty(node)?.initializer;
      // Check if the initializer is an arrow function or a function expression
      if (
        !loadFunction ||
        (!ts.isArrowFunction(loadFunction) && !ts.isFunctionExpression(loadFunction))
      ) {
        return ts.visitEachChild(node, visitor, context);
      }

      let callExpression: ts.CallExpression | undefined;

      if (ts.isArrowFunction(loadFunction)) {
        // Handle arrow functions: body can either be a block or a direct call expression
        const body = loadFunction.body;

        if (ts.isBlock(body)) {
          // Arrow function with a block: check the first statement for a return call expression
          const firstStatement = body.statements[0];

          if (
            firstStatement &&
            ts.isReturnStatement(firstStatement) &&
            firstStatement.expression &&
            ts.isCallExpression(firstStatement.expression)
          ) {
            callExpression = firstStatement.expression;
          }
        } else if (ts.isCallExpression(body)) {
          // Arrow function with a direct call expression as its body
          callExpression = body;
        }
      } else if (ts.isFunctionExpression(loadFunction)) {
        // Handle function expressions: check for a return statement with a call expression
        const returnExpression = loadFunction.body.statements.find(
          ts.isReturnStatement,
        )?.expression;

        if (returnExpression && ts.isCallExpression(returnExpression)) {
          callExpression = returnExpression;
        }
      }

      if (!callExpression) {
        return ts.visitEachChild(node, visitor, context);
      }

      // Optionally check for the 'then' property access expression
      const expression = callExpression.expression;
      if (
        !ts.isCallExpression(expression) &&
        ts.isPropertyAccessExpression(expression) &&
        expression.name.text !== 'then'
      ) {
        return ts.visitEachChild(node, visitor, context);
      }

      const importExpression = ts.isPropertyAccessExpression(expression)
        ? expression.expression // Navigate to the underlying expression for 'then'
        : callExpression;

      // Ensure the underlying expression is an import call
      if (
        !ts.isCallExpression(importExpression) ||
        importExpression.expression.kind !== ts.SyntaxKind.ImportKeyword
      ) {
        return ts.visitEachChild(node, visitor, context);
      }

      // Check if the argument to the import call is a string literal
      const callExpressionArgument = importExpression.arguments[0];
      if (!ts.isStringLiteralLike(callExpressionArgument)) {
        // Not a string literal, so skip it.
        return ts.visitEachChild(node, visitor, context);
      }

      const resolvedPath = ts.resolveModuleName(
        callExpressionArgument.text,
        node.getSourceFile().fileName,
        compilerOptions,
        compilerHost,
        moduleResolutionCache,
      )?.resolvedModule?.resolvedFileName;

      if (!resolvedPath) {
        // Could not resolve the module, so skip it.
        return ts.visitEachChild(node, visitor, context);
      }

      const resolvedRelativePath = relative(basePath, resolvedPath);

      // Create the new property
      // Example: `...(typeof ngServerMode !== "undefined" && ngServerMode ? { ɵentryName: "src/home.ts" }: {})`
      const newProperty = factory.createSpreadAssignment(
        factory.createParenthesizedExpression(
          factory.createConditionalExpression(
            factory.createBinaryExpression(
              factory.createBinaryExpression(
                factory.createTypeOfExpression(factory.createIdentifier('ngServerMode')),
                factory.createToken(ts.SyntaxKind.ExclamationEqualsEqualsToken),
                factory.createStringLiteral('undefined'),
              ),
              factory.createToken(ts.SyntaxKind.AmpersandAmpersandToken),
              factory.createIdentifier('ngServerMode'),
            ),
            factory.createToken(ts.SyntaxKind.QuestionToken),
            factory.createObjectLiteralExpression([
              factory.createPropertyAssignment(
                factory.createIdentifier('ɵentryName'),
                factory.createStringLiteral(resolvedRelativePath),
              ),
            ]),
            factory.createToken(ts.SyntaxKind.ColonToken),
            factory.createObjectLiteralExpression([]),
          ),
        ),
      );

      // Add the new property to the object literal.
      return factory.updateObjectLiteralExpression(node, [...node.properties, newProperty]);
    };

    return (sourceFile) => {
      const text = sourceFile.text;
      if (!text.includes('loadC')) {
        // Fast check for 'loadComponent' and 'loadChildren'.
        return sourceFile;
      }

      return ts.visitEachChild(sourceFile, visitor, context);
    };
  };
}

/**
 * Retrieves the property assignment for the `loadComponent` or `loadChildren` property of a route object.
 *
 * @param node The object literal expression to search.
 * @returns The property assignment if found, otherwise `undefined`.
 */
function getLoadComponentOrChildrenProperty(
  node: ts.ObjectLiteralExpression,
): ts.PropertyAssignment | undefined {
  let hasPathProperty = false;
  let loadComponentOrChildrenProperty: ts.PropertyAssignment | undefined;
  for (const prop of node.properties) {
    if (!ts.isPropertyAssignment(prop) || !ts.isIdentifier(prop.name)) {
      continue;
    }

    const propertyNameText = prop.name.text;
    if (propertyNameText === 'path') {
      hasPathProperty = true;
    } else if (propertyNameText === 'loadComponent' || propertyNameText === 'loadChildren') {
      loadComponentOrChildrenProperty = prop;
    }

    if (hasPathProperty && loadComponentOrChildrenProperty) {
      break;
    }
  }

  return loadComponentOrChildrenProperty;
}
