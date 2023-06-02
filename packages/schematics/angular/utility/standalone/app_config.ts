/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Tree } from '@angular-devkit/schematics';
import { dirname, join } from 'path';
import ts from '../../third_party/github.com/Microsoft/TypeScript/lib/typescript';
import { getSourceFile } from './util';

/** App config that was resolved to its source node. */
export interface ResolvedAppConfig {
  /** Tree-relative path of the file containing the app config. */
  filePath: string;

  /** Node defining the app config. */
  node: ts.ObjectLiteralExpression;
}

/**
 * Resolves the node that defines the app config from a bootstrap call.
 * @param bootstrapCall Call for which to resolve the config.
 * @param tree File tree of the project.
 * @param filePath File path of the bootstrap call.
 */
export function findAppConfig(
  bootstrapCall: ts.CallExpression,
  tree: Tree,
  filePath: string,
): ResolvedAppConfig | null {
  if (bootstrapCall.arguments.length > 1) {
    const config = bootstrapCall.arguments[1];

    if (ts.isObjectLiteralExpression(config)) {
      return { filePath, node: config };
    }

    if (ts.isIdentifier(config)) {
      return resolveAppConfigFromIdentifier(config, tree, filePath);
    }
  }

  return null;
}

/**
 * Resolves the app config from an identifier referring to it.
 * @param identifier Identifier referring to the app config.
 * @param tree File tree of the project.
 * @param bootstapFilePath Path of the bootstrap call.
 */
function resolveAppConfigFromIdentifier(
  identifier: ts.Identifier,
  tree: Tree,
  bootstapFilePath: string,
): ResolvedAppConfig | null {
  const sourceFile = identifier.getSourceFile();

  for (const node of sourceFile.statements) {
    // Only look at relative imports. This will break if the app uses a path
    // mapping to refer to the import, but in order to resolve those, we would
    // need knowledge about the entire program.
    if (
      !ts.isImportDeclaration(node) ||
      !node.importClause?.namedBindings ||
      !ts.isNamedImports(node.importClause.namedBindings) ||
      !ts.isStringLiteralLike(node.moduleSpecifier) ||
      !node.moduleSpecifier.text.startsWith('.')
    ) {
      continue;
    }

    for (const specifier of node.importClause.namedBindings.elements) {
      if (specifier.name.text !== identifier.text) {
        continue;
      }

      // Look for a variable with the imported name in the file. Note that ideally we would use
      // the type checker to resolve this, but we can't because these utilities are set up to
      // operate on individual files, not the entire program.
      const filePath = join(dirname(bootstapFilePath), node.moduleSpecifier.text + '.ts');
      const importedSourceFile = getSourceFile(tree, filePath);
      const resolvedVariable = findAppConfigFromVariableName(
        importedSourceFile,
        (specifier.propertyName || specifier.name).text,
      );

      if (resolvedVariable) {
        return { filePath, node: resolvedVariable };
      }
    }
  }

  const variableInSameFile = findAppConfigFromVariableName(sourceFile, identifier.text);

  return variableInSameFile ? { filePath: bootstapFilePath, node: variableInSameFile } : null;
}

/**
 * Finds an app config within the top-level variables of a file.
 * @param sourceFile File in which to search for the config.
 * @param variableName Name of the variable containing the config.
 */
function findAppConfigFromVariableName(
  sourceFile: ts.SourceFile,
  variableName: string,
): ts.ObjectLiteralExpression | null {
  for (const node of sourceFile.statements) {
    if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (
          ts.isIdentifier(decl.name) &&
          decl.name.text === variableName &&
          decl.initializer &&
          ts.isObjectLiteralExpression(decl.initializer)
        ) {
          return decl.initializer;
        }
      }
    }
  }

  return null;
}
