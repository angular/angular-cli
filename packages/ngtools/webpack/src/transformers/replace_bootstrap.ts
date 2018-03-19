/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { dirname, relative } from 'path';
import * as ts from 'typescript';
import { collectDeepNodes } from './ast_helpers';
import { insertStarImport } from './insert_import';
import { ReplaceNodeOperation, StandardTransform, TransformOperation } from './interfaces';
import { makeTransform } from './make_transform';


export function replaceBootstrap(
  shouldTransform: (fileName: string) => boolean,
  getEntryModule: () => { path: string, className: string } | null,
  getTypeChecker: () => ts.TypeChecker,
): ts.TransformerFactory<ts.SourceFile> {

  const standardTransform: StandardTransform = function (sourceFile: ts.SourceFile) {
    const ops: TransformOperation[] = [];

    const entryModule = getEntryModule();

    if (!shouldTransform(sourceFile.fileName) || !entryModule) {
      return ops;
    }

    // Find all identifiers.
    const entryModuleIdentifiers = collectDeepNodes<ts.Identifier>(sourceFile,
      ts.SyntaxKind.Identifier)
      .filter(identifier => identifier.text === entryModule.className);

    if (entryModuleIdentifiers.length === 0) {
      return [];
    }

    const relativeEntryModulePath = relative(dirname(sourceFile.fileName), entryModule.path);
    const normalizedEntryModulePath = `./${relativeEntryModulePath}`.replace(/\\/g, '/');

    // Find the bootstrap calls.
    entryModuleIdentifiers.forEach(entryModuleIdentifier => {
      // Figure out if it's a `platformBrowserDynamic().bootstrapModule(AppModule)` call.
      if (!(
        entryModuleIdentifier.parent
        && entryModuleIdentifier.parent.kind === ts.SyntaxKind.CallExpression
      )) {
        return;
      }

      const callExpr = entryModuleIdentifier.parent as ts.CallExpression;

      if (callExpr.expression.kind !== ts.SyntaxKind.PropertyAccessExpression) {
        return;
      }

      const propAccessExpr = callExpr.expression as ts.PropertyAccessExpression;

      if (propAccessExpr.name.text !== 'bootstrapModule'
        || propAccessExpr.expression.kind !== ts.SyntaxKind.CallExpression) {
        return;
      }

      const bootstrapModuleIdentifier = propAccessExpr.name;
      const innerCallExpr = propAccessExpr.expression as ts.CallExpression;

      if (!(
        innerCallExpr.expression.kind === ts.SyntaxKind.Identifier
        && (innerCallExpr.expression as ts.Identifier).text === 'platformBrowserDynamic'
      )) {
        return;
      }

      const platformBrowserDynamicIdentifier = innerCallExpr.expression as ts.Identifier;

      const idPlatformBrowser = ts.createUniqueName('__NgCli_bootstrap_');
      const idNgFactory = ts.createUniqueName('__NgCli_bootstrap_');

      // Add the transform operations.
      const factoryClassName = entryModule.className + 'NgFactory';
      const factoryModulePath = normalizedEntryModulePath + '.ngfactory';
      ops.push(
        // Replace the entry module import.
        ...insertStarImport(sourceFile, idNgFactory, factoryModulePath),
        new ReplaceNodeOperation(sourceFile, entryModuleIdentifier,
          ts.createPropertyAccess(idNgFactory, ts.createIdentifier(factoryClassName))),
        // Replace the platformBrowserDynamic import.
        ...insertStarImport(sourceFile, idPlatformBrowser, '@angular/platform-browser'),
        new ReplaceNodeOperation(sourceFile, platformBrowserDynamicIdentifier,
          ts.createPropertyAccess(idPlatformBrowser, 'platformBrowser')),
        new ReplaceNodeOperation(sourceFile, bootstrapModuleIdentifier,
          ts.createIdentifier('bootstrapModuleFactory')),
      );
    });

    return ops;
  };

  return makeTransform(standardTransform, getTypeChecker);
}
