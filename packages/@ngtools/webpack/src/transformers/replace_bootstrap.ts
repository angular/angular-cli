// @ignoreDep typescript
import * as ts from 'typescript';
import { relative, dirname } from 'path';

import { findAstNodes } from './ast_helpers';
import { insertStarImport } from './insert_import';
import { removeImport } from './remove_import';
import {
  ReplaceNodeOperation,
  TransformOperation
} from './make_transform';


export function replaceBootstrap(
  sourceFile: ts.SourceFile,
  entryModule: { path: string, className: string }
): TransformOperation[] {
  const ops: TransformOperation[] = [];

  // Find all identifiers.
  const entryModuleIdentifiers = findAstNodes<ts.Identifier>(null, sourceFile,
    ts.SyntaxKind.Identifier, true)
    .filter(identifier => identifier.getText() === entryModule.className);

  if (entryModuleIdentifiers.length === 0) {
    return [];
  }

  const relativeEntryModulePath = relative(dirname(sourceFile.fileName), entryModule.path);
  const normalizedEntryModulePath = `./${relativeEntryModulePath}`.replace(/\\/g, '/');

  // Find the bootstrap calls.
  const removedEntryModuleIdentifiers: ts.Identifier[] = [];
  const removedPlatformBrowserDynamicIdentifier: ts.Identifier[] = [];
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

    // Save the import identifiers that we replaced for removal.
    removedEntryModuleIdentifiers.push(entryModuleIdentifier);
    removedPlatformBrowserDynamicIdentifier.push(platformBrowserDynamicIdentifier);
  });

  // Now that we know all the import identifiers we removed, we can remove the import.
  ops.push(
    ...removeImport(sourceFile, removedEntryModuleIdentifiers),
    ...removeImport(sourceFile, removedPlatformBrowserDynamicIdentifier),
  );

  return ops;
}
