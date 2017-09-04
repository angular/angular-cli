import * as ts from 'typescript';

import { findAstNodes } from './ast_helpers';
import { insertImport } from './insert_import';
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

  // Find all identifiers using the entry module class name.
  const entryModuleIdentifiers = findAstNodes<ts.Identifier>(null, sourceFile,
    ts.SyntaxKind.Identifier, true)
    .filter(identifier => identifier.getText() === entryModule.className);

  if (entryModuleIdentifiers.length === 0) {
    return [];
  }

  // Get the module path from the import.
  let modulePath: string;
  entryModuleIdentifiers.forEach((entryModuleIdentifier) => {
    // TODO: only supports `import {A, B, C} from 'modulePath'` atm, add other import support later.
    if (entryModuleIdentifier.parent.kind !== ts.SyntaxKind.ImportSpecifier) {
      return;
    }

    const importSpec = entryModuleIdentifier.parent as ts.ImportSpecifier;
    const moduleSpecifier = importSpec.parent.parent.parent.moduleSpecifier;

    if (moduleSpecifier.kind !== ts.SyntaxKind.StringLiteral) {
      return;
    }

    modulePath = (moduleSpecifier as ts.StringLiteral).text;
  });

  if (!modulePath) {
    return [];
  }

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

    // Add the transform operations.
    const factoryClassName = entryModule.className + 'NgFactory';
    const factoryModulePath = modulePath + '.ngfactory';
    ops.push(
      // Replace the entry module import.
      ...insertImport(sourceFile, factoryClassName, factoryModulePath),
      new ReplaceNodeOperation(sourceFile, entryModuleIdentifier,
        ts.createIdentifier(factoryClassName)),
      // Replace the platformBrowserDynamic import.
      ...insertImport(sourceFile, 'platformBrowser', '@angular/platform-browser'),
      new ReplaceNodeOperation(sourceFile, platformBrowserDynamicIdentifier,
        ts.createIdentifier('platformBrowser')),
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
