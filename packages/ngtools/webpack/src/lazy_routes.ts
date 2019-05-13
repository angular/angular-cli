/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { dirname, join } from 'path';
import * as ts from 'typescript';
import { findAstNodes, resolve } from './refactor';
import { forwardSlashPath } from './utils';


function _getContentOfKeyLiteral(_source: ts.SourceFile, node: ts.Node): string | null {
  if (node.kind == ts.SyntaxKind.Identifier) {
    return (node as ts.Identifier).text;
  } else if (node.kind == ts.SyntaxKind.StringLiteral) {
    return (node as ts.StringLiteral).text;
  } else {
    return null;
  }
}


export interface LazyRouteMap {
  [path: string]: string;
}


export function findLazyRoutes(
  filePath: string,
  host: ts.CompilerHost,
  program?: ts.Program,
  compilerOptions?: ts.CompilerOptions,
): LazyRouteMap {
  if (!compilerOptions) {
    if (!program) {
      throw new Error('Must pass either program or compilerOptions to findLazyRoutes.');
    }
    compilerOptions = program.getCompilerOptions();
  }
  const fileName = forwardSlashPath(resolve(filePath, host, compilerOptions));
  let sourceFile: ts.SourceFile | undefined;
  if (program) {
    sourceFile = program.getSourceFile(fileName);
  }

  if (!sourceFile) {
    const content = host.readFile(fileName);
    if (content) {
      sourceFile = ts.createSourceFile(fileName, content, ts.ScriptTarget.Latest, true);
    }
  }

  if (!sourceFile) {
    throw new Error(`Source file not found: '${fileName}'.`);
  }
  const sf: ts.SourceFile = sourceFile;

  return findAstNodes(null, sourceFile, ts.SyntaxKind.ObjectLiteralExpression, true)
    // Get all their property assignments.
    .map((node: ts.ObjectLiteralExpression) => {
      return findAstNodes(node, sf, ts.SyntaxKind.PropertyAssignment, false);
    })
    // Take all `loadChildren` elements.
    .reduce((acc: ts.PropertyAssignment[], props: ts.PropertyAssignment[]) => {
      return acc.concat(props.filter(literal => {
        return _getContentOfKeyLiteral(sf, literal.name) == 'loadChildren';
      }));
    }, [])
    // Get only string values.
    .filter((node: ts.PropertyAssignment) => node.initializer.kind == ts.SyntaxKind.StringLiteral)
    // Get the string value.
    .map((node: ts.PropertyAssignment) => (node.initializer as ts.StringLiteral).text)
    // Map those to either [path, absoluteModulePath], or [path, null] if the module pointing to
    // does not exist.
    .map((routePath: string) => {
      const moduleName = routePath.split('#')[0];
      const compOptions = (program && program.getCompilerOptions()) || compilerOptions || {};
      const resolvedModuleName: ts.ResolvedModuleWithFailedLookupLocations = moduleName[0] == '.'
        ? ({
            resolvedModule: { resolvedFileName: join(dirname(filePath), moduleName) + '.ts' },
          } as ts.ResolvedModuleWithFailedLookupLocations)
        : ts.resolveModuleName(moduleName, filePath, compOptions, host);
      if (resolvedModuleName.resolvedModule
          && resolvedModuleName.resolvedModule.resolvedFileName
          && host.fileExists(resolvedModuleName.resolvedModule.resolvedFileName)) {
        return [routePath, resolvedModuleName.resolvedModule.resolvedFileName];
      } else {
        return [routePath, null];
      }
    })
    // Reduce to the LazyRouteMap map.
    .reduce((acc: LazyRouteMap, [routePath, resolvedModuleName]: [string, string | null]) => {
      if (resolvedModuleName) {
        acc[routePath] = resolvedModuleName;
      }

      return acc;
    }, {});
}
