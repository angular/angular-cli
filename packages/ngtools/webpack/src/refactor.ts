/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as path from 'path';
import * as ts from 'typescript';
import { forwardSlashPath } from './utils';


/**
 * Find all nodes from the AST in the subtree of node of SyntaxKind kind.
 * @param node The root node to check, or null if the whole tree should be searched.
 * @param sourceFile The source file where the node is.
 * @param kind The kind of nodes to find.
 * @param recursive Whether to go in matched nodes to keep matching.
 * @param max The maximum number of items to return.
 * @return all nodes of kind, or [] if none is found
 */
// TODO: replace this with collectDeepNodes and add limits to collectDeepNodes
export function findAstNodes<T extends ts.Node>(
  node: ts.Node | null,
  sourceFile: ts.SourceFile,
  kind: ts.SyntaxKind,
  recursive = false,
  max = Infinity,
): T[] {
  // TODO: refactor operations that only need `refactor.findAstNodes()` to use this instead.
  if (max == 0) {
    return [];
  }
  if (!node) {
    node = sourceFile;
  }

  const arr: T[] = [];
  if (node.kind === kind) {
    // If we're not recursively looking for children, stop here.
    if (!recursive) {
      return [node as T];
    }

    arr.push(node as T);
    max--;
  }

  if (max > 0) {
    for (const child of node.getChildren(sourceFile)) {
      findAstNodes(child, sourceFile, kind, recursive, max)
        .forEach((node: ts.Node) => {
          if (max > 0) {
            arr.push(node as T);
          }
          max--;
        });

      if (max <= 0) {
        break;
      }
    }
  }

  return arr;
}

export function resolve(
  filePath: string,
  _host: ts.CompilerHost,
  compilerOptions: ts.CompilerOptions,
): string {
  if (path.isAbsolute(filePath)) {
    return filePath;
  }
  const basePath = compilerOptions.baseUrl || compilerOptions.rootDir;
  if (!basePath) {
    throw new Error(`Trying to resolve '${filePath}' without a basePath.`);
  }

  return path.join(basePath, filePath);
}


export class TypeScriptFileRefactor {
  private _fileName: string;
  private _sourceFile: ts.SourceFile;

  get fileName() { return this._fileName; }
  get sourceFile() { return this._sourceFile; }

  constructor(fileName: string,
              _host: ts.CompilerHost,
              _program?: ts.Program,
              source?: string | null) {
    let sourceFile: ts.SourceFile | null = null;

    if (_program) {
      fileName = forwardSlashPath(resolve(fileName, _host, _program.getCompilerOptions()));
      this._fileName = fileName;

      if (source) {
        sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true);
      } else {
        sourceFile = _program.getSourceFile(fileName) || null;
      }
    }
    if (!sourceFile) {
      const maybeContent = source || _host.readFile(fileName);
      if (maybeContent) {
        sourceFile = ts.createSourceFile(
          fileName,
          maybeContent,
          ts.ScriptTarget.Latest,
          true,
        );
      }
    }
    if (!sourceFile) {
      throw new Error('Must have a source file to refactor.');
    }

    this._sourceFile = sourceFile;
  }

  /**
   * Find all nodes from the AST in the subtree of node of SyntaxKind kind.
   * @param node The root node to check, or null if the whole tree should be searched.
   * @param kind The kind of nodes to find.
   * @param recursive Whether to go in matched nodes to keep matching.
   * @param max The maximum number of items to return.
   * @return all nodes of kind, or [] if none is found
   */
  findAstNodes(node: ts.Node | null,
               kind: ts.SyntaxKind,
               recursive = false,
               max = Infinity): ts.Node[] {
    return findAstNodes(node, this._sourceFile, kind, recursive, max);
  }

}
