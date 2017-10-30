// @ignoreDep typescript
import * as path from 'path';
import * as ts from 'typescript';

import { LazyRouteMap } from '../lazy_routes';
import { getLastNode, getFirstNode } from './ast_helpers';
import { StandardTransform, TransformOperation, AddNodeOperation } from './interfaces';
import { makeTransform } from './make_transform';

export function exportLazyModuleMap(
  shouldTransform: (fileName: string) => boolean,
  lazyRoutesCb: () => LazyRouteMap,
): ts.TransformerFactory<ts.SourceFile> {

  const standardTransform: StandardTransform = function (sourceFile: ts.SourceFile) {
    const ops: TransformOperation[] = [];

    const lazyRoutes = lazyRoutesCb();

    if (!shouldTransform(sourceFile.fileName)) {
      return ops;
    }

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
      modules.map((mod, idx) => {
        let [modulePath, moduleName] = mod.loadChildrenString.split('#');
        if (modulePath.match(/\.ngfactory/)) {
          modulePath = modulePath.replace('.ngfactory', '');
          moduleName = moduleName.replace('NgFactory', '');
        }

        return ts.createPropertyAssignment(
          ts.createLiteral(`${modulePath}#${moduleName}`),
          ts.createPropertyAccess(ts.createIdentifier(`__lazy_${idx}__`), mod.moduleName));
      })
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
  };

  return makeTransform(standardTransform);
}
