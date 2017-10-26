// @ignoreDep typescript
import * as ts from 'typescript';

import { findAstNodes, getFirstNode } from './ast_helpers';
import { AddNodeOperation, TransformOperation } from './make_transform';
import { insertStarImport } from './insert_import';


export function registerLocaleData(
  sourceFile: ts.SourceFile,
  entryModule: { path: string, className: string },
  locale: string
): TransformOperation[] {
  const ops: TransformOperation[] = [];

  // Find all identifiers using the entry module class name.
  const entryModuleIdentifiers = findAstNodes<ts.Identifier>(null, sourceFile,
    ts.SyntaxKind.Identifier, true)
    .filter(identifier => identifier.getText() === entryModule.className);

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

    // Create the import node for the locale.
    const localeNamespaceId = ts.createUniqueName('__NgCli_locale_');
    ops.push(...insertStarImport(
      sourceFile, localeNamespaceId, `@angular/common/locales/${locale}`, firstNode, true
    ));

    // Create the import node for the registerLocaleData function.
    const regIdentifier = ts.createIdentifier(`registerLocaleData`);
    const regNamespaceId = ts.createUniqueName('__NgCli_locale_');
    ops.push(
      ...insertStarImport(sourceFile, regNamespaceId, '@angular/common', firstNode, true)
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
}
