import * as path from 'path';
import * as ts from 'typescript';

import { LazyRouteMap } from '../lazy_routes';
import { getLastNode, getFirstNode } from './ast_helpers';
import {
  AddNodeOperation,
  TransformOperation
} from './make_transform';

export function exportLazyModuleMap(
  sourceFile: ts.SourceFile,
  lazyRoutes: LazyRouteMap
): TransformOperation[] {
  const ops: TransformOperation[] = [];
  const dirName = path.normalize(path.dirname(sourceFile.fileName));

  const modules = Object.keys(lazyRoutes)
    .map((loadChildrenString) => {
      const [, moduleName] = loadChildrenString.split('#');
      const modulePath = lazyRoutes[loadChildrenString];

      return {
        modulePath,
        moduleName,
        loadChildrenString
      };
    });

  modules.forEach((module, index) => {
    const relativePath = path.relative(dirName, module.modulePath!).replace(/\\/g, '/');
    // Create the new namespace import node.
    const namespaceImport = ts.createNamespaceImport(ts.createIdentifier(`__lazy_${index}__`));
    const importClause = ts.createImportClause(undefined, namespaceImport);
    const newImport = ts.createImportDeclaration(undefined, undefined, importClause,
      ts.createLiteral(relativePath));

    ops.push(new AddNodeOperation(
      sourceFile,
      getFirstNode(sourceFile),
      newImport
    ));
  });

  const lazyModuleObjectLiteral = ts.createObjectLiteral(
    modules.map((mod, idx) => ts.createPropertyAssignment(
      ts.createLiteral(mod.loadChildrenString),
      ts.createPropertyAccess(ts.createIdentifier(`__lazy_${idx}__`), mod.moduleName))
    )
  );

  const lazyModuleVariableStmt = ts.createVariableStatement(
    [ts.createToken(ts.SyntaxKind.ExportKeyword)],
    [ts.createVariableDeclaration('LAZY_MODULE_MAP', undefined, lazyModuleObjectLiteral)]
  );

  ops.push(new AddNodeOperation(
    sourceFile,
    getLastNode(sourceFile),
    undefined,
    lazyModuleVariableStmt
  ));

  return ops;
}
