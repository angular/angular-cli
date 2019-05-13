/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as path from 'path';
import * as ts from 'typescript';
import { LazyRouteMap } from '../lazy_routes';
import { forwardSlashPath } from '../utils';
import { getFirstNode, getLastNode } from './ast_helpers';
import { AddNodeOperation, StandardTransform, TransformOperation } from './interfaces';
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
          loadChildrenString,
        };
      });

    modules.forEach((module, index) => {
      const modulePath = module.modulePath;
      if (!modulePath) {
        return;
      }

      let relativePath = forwardSlashPath(path.relative(dirName, modulePath));
      if (!(relativePath.startsWith('./') || relativePath.startsWith('../'))) {
        // 'a/b/c' is a relative path for Node but an absolute path for TS, so we must convert it.
        relativePath = `./${relativePath}`;
      }
      // Create the new namespace import node.
      const namespaceImport = ts.createNamespaceImport(ts.createIdentifier(`__lazy_${index}__`));
      const importClause = ts.createImportClause(undefined, namespaceImport);
      const newImport = ts.createImportDeclaration(undefined, undefined, importClause,
        ts.createLiteral(relativePath));

      const firstNode = getFirstNode(sourceFile);
      if (firstNode) {
        ops.push(new AddNodeOperation(sourceFile, firstNode, newImport));
      }
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
      }),
    );

    const lazyModuleVariableStmt = ts.createVariableStatement(
      [ts.createToken(ts.SyntaxKind.ExportKeyword)],
      [ts.createVariableDeclaration('LAZY_MODULE_MAP', undefined, lazyModuleObjectLiteral)],
    );

    const lastNode = getLastNode(sourceFile);
    if (lastNode) {
      ops.push(new AddNodeOperation(sourceFile, lastNode, undefined, lazyModuleVariableStmt));
    }

    return ops;
  };

  return makeTransform(standardTransform);
}
