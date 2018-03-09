import {dirname, join} from 'path';
import * as ts from 'typescript';
import { findAstNodes, resolve } from './refactor';


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
  [path: string]: string | null;
}


export function findLazyRoutes(
  filePath: string,
  host: ts.CompilerHost,
  program?: ts.Program,
  compilerOptions?: ts.CompilerOptions
): LazyRouteMap {
  if (!compilerOptions && program) {
    compilerOptions = program.getCompilerOptions();
  }
  const fileName = resolve(filePath, host, compilerOptions).replace(/\\/g, '/');
  let sourceFile: ts.SourceFile;
  if (program) {
    sourceFile = program.getSourceFile(fileName);
  }
  if (!sourceFile) {
    sourceFile = ts.createSourceFile(
      fileName,
      host.readFile(fileName),
      ts.ScriptTarget.Latest,
      true,
    );
  }
  if (!sourceFile) {
    throw new Error(`Source file not found: '${fileName}'.`);
  }

  return findAstNodes(null, sourceFile, ts.SyntaxKind.ObjectLiteralExpression, true)
    // Get all their property assignments.
    .map((node: ts.ObjectLiteralExpression) => {
      return findAstNodes(node, sourceFile, ts.SyntaxKind.PropertyAssignment, false);
    })
    // Take all `loadChildren` elements.
    .reduce((acc: ts.PropertyAssignment[], props: ts.PropertyAssignment[]) => {
      return acc.concat(props.filter(literal => {
        return _getContentOfKeyLiteral(sourceFile, literal.name) == 'loadChildren';
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
      const compOptions = program ? program.getCompilerOptions() : compilerOptions;
      const resolvedModuleName: ts.ResolvedModuleWithFailedLookupLocations = moduleName[0] == '.'
        ? ({
            resolvedModule: { resolvedFileName: join(dirname(filePath), moduleName) + '.ts' }
          } as any)
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
      acc[routePath] = resolvedModuleName;
      return acc;
    }, {});
}
