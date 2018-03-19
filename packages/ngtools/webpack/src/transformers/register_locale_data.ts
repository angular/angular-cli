/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';
import { collectDeepNodes, getFirstNode } from './ast_helpers';
import { insertStarImport } from './insert_import';
import { AddNodeOperation, StandardTransform, TransformOperation } from './interfaces';
import { makeTransform } from './make_transform';


export function registerLocaleData(
  shouldTransform: (fileName: string) => boolean,
  getEntryModule: () => { path: string, className: string } | null,
  locale: string,
): ts.TransformerFactory<ts.SourceFile> {

  const standardTransform: StandardTransform = function (sourceFile: ts.SourceFile) {
    const ops: TransformOperation[] = [];

    const entryModule = getEntryModule();

    if (!shouldTransform(sourceFile.fileName) || !entryModule || !locale) {
      return ops;
    }

    // Find all identifiers using the entry module class name.
    const entryModuleIdentifiers = collectDeepNodes<ts.Identifier>(sourceFile,
      ts.SyntaxKind.Identifier)
      .filter(identifier => identifier.text === entryModule.className);

    if (entryModuleIdentifiers.length === 0) {
      return [];
    }

    // Find the bootstrap call
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

      const firstNode = getFirstNode(sourceFile);

      if (!firstNode) {
        return;
      }

      // Create the import node for the locale.
      const localeNamespaceId = ts.createUniqueName('__NgCli_locale_');
      ops.push(...insertStarImport(
        sourceFile,
        localeNamespaceId,
        `@angular/common/locales/${locale}`,
        firstNode,
        true,
      ));

      // Create the import node for the registerLocaleData function.
      const regIdentifier = ts.createIdentifier(`registerLocaleData`);
      const regNamespaceId = ts.createUniqueName('__NgCli_locale_');
      ops.push(
        ...insertStarImport(sourceFile, regNamespaceId, '@angular/common', firstNode, true),
      );

      // Create the register function call
      const registerFunctionCall = ts.createCall(
        ts.createPropertyAccess(regNamespaceId, regIdentifier),
        undefined,
        [ts.createPropertyAccess(localeNamespaceId, 'default')],
      );
      const registerFunctionStatement = ts.createStatement(registerFunctionCall);

      ops.push(new AddNodeOperation(
        sourceFile,
        firstNode,
        registerFunctionStatement,
      ));
    });

    return ops;
  };

  return makeTransform(standardTransform);
}
