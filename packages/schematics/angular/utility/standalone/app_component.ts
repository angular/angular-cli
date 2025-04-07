/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { SchematicsException, Tree } from '@angular-devkit/schematics';
import ts from '../../third_party/github.com/Microsoft/TypeScript/lib/typescript';
import { getDecoratorMetadata, getMetadataField } from '../ast-utils';
import { findBootstrapModuleCall, getAppModulePath } from '../ng-ast-utils';
import { findBootstrapApplicationCall, getSourceFile } from './util';

/** Data resolved for a bootstrapped component. */
interface BootstrappedComponentData {
  /** Original name of the component class. */
  componentName: string;

  /** Path under which the component was imported in the main entrypoint. */
  componentImportPathInSameFile: string;

  /** Original name of the NgModule being bootstrapped, null if the app isn't module-based. */
  moduleName: string | null;

  /**
   * Path under which the module was imported in the main entrypoint,
   * null if the app isn't module-based.
   */
  moduleImportPathInSameFile: string | null;
}

/**
 * Finds the original name and path relative to the `main.ts` of the bootrstrapped app component.
 * @param tree File tree in which to look for the component.
 * @param mainFilePath Path of the `main` file.
 */
export function resolveBootstrappedComponentData(
  tree: Tree,
  mainFilePath: string,
): BootstrappedComponentData | null {
  // First try to resolve for a standalone app.
  try {
    const call = findBootstrapApplicationCall(tree, mainFilePath);

    if (call.arguments.length > 0 && ts.isIdentifier(call.arguments[0])) {
      const resolved = resolveIdentifier(call.arguments[0]);

      if (resolved) {
        return {
          componentName: resolved.name,
          componentImportPathInSameFile: resolved.path,
          moduleName: null,
          moduleImportPathInSameFile: null,
        };
      }
    }
  } catch (e) {
    // `findBootstrapApplicationCall` will throw if it can't find the `bootrstrapApplication` call.
    // Catch so we can continue to the fallback logic.
    if (!(e instanceof SchematicsException)) {
      throw e;
    }
  }

  // Otherwise fall back to resolving an NgModule-based app.
  return resolveNgModuleBasedData(tree, mainFilePath);
}

/** Resolves the bootstrap data for a NgModule-based app. */
function resolveNgModuleBasedData(
  tree: Tree,
  mainFilePath: string,
): BootstrappedComponentData | null {
  const appModulePath = getAppModulePath(tree, mainFilePath);
  const appModuleFile = getSourceFile(tree, appModulePath);
  const metadataNodes = getDecoratorMetadata(appModuleFile, 'NgModule', '@angular/core');

  for (const node of metadataNodes) {
    if (!ts.isObjectLiteralExpression(node)) {
      continue;
    }

    const bootstrapProp = getMetadataField(node, 'bootstrap').find((prop) => {
      return (
        ts.isArrayLiteralExpression(prop.initializer) &&
        prop.initializer.elements.length > 0 &&
        ts.isIdentifier(prop.initializer.elements[0])
      );
    });

    const componentIdentifier = (bootstrapProp?.initializer as ts.ArrayLiteralExpression)
      .elements[0] as ts.Identifier | undefined;
    const componentResult = componentIdentifier ? resolveIdentifier(componentIdentifier) : null;
    const bootstrapCall = findBootstrapModuleCall(tree, mainFilePath);

    if (
      componentResult &&
      bootstrapCall &&
      bootstrapCall.arguments.length > 0 &&
      ts.isIdentifier(bootstrapCall.arguments[0])
    ) {
      const moduleResult = resolveIdentifier(bootstrapCall.arguments[0]);

      if (moduleResult) {
        return {
          componentName: componentResult.name,
          componentImportPathInSameFile: componentResult.path,
          moduleName: moduleResult.name,
          moduleImportPathInSameFile: moduleResult.path,
        };
      }
    }
  }

  return null;
}

/** Resolves an identifier to its original name and path that it was imported from. */
function resolveIdentifier(identifier: ts.Identifier): { name: string; path: string } | null {
  const sourceFile = identifier.getSourceFile();

  // Try to resolve the import path by looking at the top-level named imports of the file.
  for (const node of sourceFile.statements) {
    if (
      !ts.isImportDeclaration(node) ||
      !ts.isStringLiteral(node.moduleSpecifier) ||
      !node.importClause ||
      !node.importClause.namedBindings ||
      !ts.isNamedImports(node.importClause.namedBindings)
    ) {
      continue;
    }

    for (const element of node.importClause.namedBindings.elements) {
      if (element.name.text === identifier.text) {
        return {
          // Note that we use `propertyName` if available, because it contains
          // the real name in the case where the import is aliased.
          name: (element.propertyName || element.name).text,
          path: node.moduleSpecifier.text,
        };
      }
    }
  }

  return null;
}
