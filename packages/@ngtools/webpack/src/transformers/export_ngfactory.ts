// @ignoreDep typescript
import * as ts from 'typescript';
import { relative, dirname } from 'path';

import { findAstNodes, getFirstNode } from './ast_helpers';
import { TransformOperation, AddNodeOperation } from './make_transform';

export function exportNgFactory(
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

  const relativeEntryModulePath = relative(dirname(sourceFile.fileName), entryModule.path);
  const normalizedEntryModulePath = `./${relativeEntryModulePath}`.replace(/\\/g, '/');

  // Get the module path from the import.
  let modulePath: string;
  entryModuleIdentifiers.forEach((entryModuleIdentifier) => {
    if (entryModuleIdentifier.parent.kind !== ts.SyntaxKind.ExportSpecifier) {
      return;
    }

    const exportSpec = entryModuleIdentifier.parent as ts.ExportSpecifier;
    const moduleSpecifier = exportSpec.parent.parent.moduleSpecifier;

    if (moduleSpecifier.kind !== ts.SyntaxKind.StringLiteral) {
      return;
    }

    modulePath = (moduleSpecifier as ts.StringLiteral).text;

    // Add the transform operations.
    const factoryClassName = entryModule.className + 'NgFactory';
    const factoryModulePath = normalizedEntryModulePath + '.ngfactory';

    const namedExports = ts.createNamedExports([ts.createExportSpecifier(undefined,
      ts.createIdentifier(factoryClassName))]);
    const newImport = ts.createExportDeclaration(undefined, undefined, namedExports,
      ts.createLiteral(factoryModulePath));

    ops.push(new AddNodeOperation(
      sourceFile,
      getFirstNode(sourceFile),
      newImport
    ));
  });

  return ops;
}
