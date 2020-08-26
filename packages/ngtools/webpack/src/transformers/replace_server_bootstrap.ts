/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { dirname, relative } from 'path';
import * as ts from 'typescript';
import { forwardSlashPath } from '../utils';
import { collectDeepNodes } from './ast_helpers';
import { insertStarImport } from './insert_import';
import { ReplaceNodeOperation, StandardTransform, TransformOperation } from './interfaces';
import { makeTransform } from './make_transform';

export function replaceServerBootstrap(
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
    const normalizedEntryModulePath = forwardSlashPath(`./${relativeEntryModulePath}`);
    const factoryClassName = entryModule.className + 'NgFactory';
    const factoryModulePath = normalizedEntryModulePath + '.ngfactory';

    // Find the bootstrap calls.
    entryModuleIdentifiers.forEach(entryModuleIdentifier => {
      if (!entryModuleIdentifier.parent) {
        return;
      }

      if (entryModuleIdentifier.parent.kind !== ts.SyntaxKind.CallExpression &&
        entryModuleIdentifier.parent.kind !== ts.SyntaxKind.PropertyAssignment) {
        return;
      }

      if (entryModuleIdentifier.parent.kind === ts.SyntaxKind.CallExpression) {
        // Figure out if it's a `platformDynamicServer().bootstrapModule(AppModule)` call.

        const callExpr = entryModuleIdentifier.parent as ts.CallExpression;

        if (callExpr.expression.kind === ts.SyntaxKind.PropertyAccessExpression) {

          const propAccessExpr = callExpr.expression as ts.PropertyAccessExpression;

          if (!(propAccessExpr.name.text === 'bootstrapModule'
            && propAccessExpr.expression.kind === ts.SyntaxKind.CallExpression)) {
            return;
          }

          const bootstrapModuleIdentifier = propAccessExpr.name;
          const innerCallExpr = propAccessExpr.expression as ts.CallExpression;

          if (!(
            innerCallExpr.expression.kind === ts.SyntaxKind.Identifier
            && (innerCallExpr.expression as ts.Identifier).text === 'platformDynamicServer'
          )) {
            return;
          }

          const platformDynamicServerIdentifier = innerCallExpr.expression as ts.Identifier;

          const idPlatformServer = ts.createUniqueName('__NgCli_bootstrap_');
          const idNgFactory = ts.createUniqueName('__NgCli_bootstrap_');

          // Add the transform operations.
          ops.push(
            // Replace the entry module import.
            ...insertStarImport(sourceFile, idNgFactory, factoryModulePath),
            new ReplaceNodeOperation(sourceFile, entryModuleIdentifier,
              ts.createPropertyAccess(idNgFactory, ts.createIdentifier(factoryClassName))),
            // Replace the platformBrowserDynamic import.
            ...insertStarImport(sourceFile, idPlatformServer, '@angular/platform-server'),
            new ReplaceNodeOperation(sourceFile, platformDynamicServerIdentifier,
              ts.createPropertyAccess(idPlatformServer, 'platformServer')),
            new ReplaceNodeOperation(sourceFile, bootstrapModuleIdentifier,
              ts.createIdentifier('bootstrapModuleFactory')),
          );
        } else if (callExpr.expression.kind === ts.SyntaxKind.Identifier) {
          // Figure out if it is renderModule

          const identifierExpr = callExpr.expression as ts.Identifier;

          if (identifierExpr.text !== 'renderModule') {
            return;
          }

          const renderModuleIdentifier = identifierExpr as ts.Identifier;

          const idPlatformServer = ts.createUniqueName('__NgCli_bootstrap_');
          const idNgFactory = ts.createUniqueName('__NgCli_bootstrap_');

          ops.push(
            // Replace the entry module import.
            ...insertStarImport(sourceFile, idNgFactory, factoryModulePath),
            new ReplaceNodeOperation(sourceFile, entryModuleIdentifier,
              ts.createPropertyAccess(idNgFactory, ts.createIdentifier(factoryClassName))),
            // Replace the renderModule import.
            ...insertStarImport(sourceFile, idPlatformServer, '@angular/platform-server'),
            new ReplaceNodeOperation(sourceFile, renderModuleIdentifier,
              ts.createPropertyAccess(idPlatformServer, 'renderModuleFactory')),
          );
        }
      } else if (entryModuleIdentifier.parent.kind === ts.SyntaxKind.PropertyAssignment) {
        // This is for things that accept a module as a property in a config object
        // .ie the express engine

        const idNgFactory = ts.createUniqueName('__NgCli_bootstrap_');

        ops.push(
          ...insertStarImport(sourceFile, idNgFactory, factoryModulePath),
          new ReplaceNodeOperation(sourceFile, entryModuleIdentifier,
            ts.createPropertyAccess(idNgFactory, ts.createIdentifier(factoryClassName))),
        );
      }
    });

    return ops;
  };

  return makeTransform(standardTransform, getTypeChecker);
}
