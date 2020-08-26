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
import { collectDeepNodes, getFirstNode } from './ast_helpers';
import { AddNodeOperation, StandardTransform, TransformOperation } from './interfaces';
import { makeTransform } from './make_transform';

export function exportNgFactory(
  shouldTransform: (fileName: string) => boolean,
  getEntryModule: () => { path: string, className: string } | null,
): ts.TransformerFactory<ts.SourceFile> {

  const standardTransform: StandardTransform = function (sourceFile: ts.SourceFile) {
    const ops: TransformOperation[] = [];

    const entryModule = getEntryModule();

    if (!shouldTransform(sourceFile.fileName) || !entryModule) {
      return ops;
    }

    // Find all identifiers using the entry module class name.
    const entryModuleIdentifiers = collectDeepNodes<ts.Identifier>(sourceFile,
      ts.SyntaxKind.Identifier)
      .filter(identifier => identifier.text === entryModule.className);

    if (entryModuleIdentifiers.length === 0) {
      return [];
    }

    const relativeEntryModulePath = relative(dirname(sourceFile.fileName), entryModule.path);
    const normalizedEntryModulePath = forwardSlashPath(`./${relativeEntryModulePath}`);

    // Get the module path from the import.
    entryModuleIdentifiers.forEach((entryModuleIdentifier) => {
      if (!entryModuleIdentifier.parent
          || entryModuleIdentifier.parent.kind !== ts.SyntaxKind.ExportSpecifier) {
        return;
      }

      const exportSpec = entryModuleIdentifier.parent as ts.ExportSpecifier;
      const moduleSpecifier = exportSpec.parent
        && exportSpec.parent.parent
        && exportSpec.parent.parent.moduleSpecifier;

      if (!moduleSpecifier || moduleSpecifier.kind !== ts.SyntaxKind.StringLiteral) {
        return;
      }

      // Add the transform operations.
      const factoryClassName = entryModule.className + 'NgFactory';
      const factoryModulePath = normalizedEntryModulePath + '.ngfactory';

      const namedExports = ts.createNamedExports([ts.createExportSpecifier(undefined,
        ts.createIdentifier(factoryClassName))]);
      const newImport = ts.createExportDeclaration(undefined, undefined, namedExports,
        ts.createLiteral(factoryModulePath));

      const firstNode = getFirstNode(sourceFile);
      if (firstNode) {
        ops.push(new AddNodeOperation(
          sourceFile,
          firstNode,
          newImport,
        ));
      }
    });

    return ops;
  };

  return makeTransform(standardTransform);
}
