import * as path from 'path';
import * as ts from 'typescript';
import * as semver from 'semver';

import { TypeScriptMagicStringFileRefactor } from './magic_string_refactor';
import { TypeScriptFileTransformRefactor } from './transform_refactor';
import { ProgramManager } from '../program_manager';

export interface TypeScriptFileRefactor {

  // Properties.
  fileName: string;
  sourceFile: ts.SourceFile;

  // Primitives.
  removeNode(node: ts.Node): void;
  removeNodes(nodes: ts.Node[]): void;
  replaceNode(node: ts.Node, replacement: ts.Node): void;
  appendNode(node: ts.Node, newNode: ts.Node): void;
  prependNode(node: ts.Node, newNode: ts.Node): void;

  // Lookups.
  getFirstNode(): ts.Node | null;
  getLastNode(): ts.Node | null;
  findFirstAstNode(node: ts.Node | null, kind: ts.SyntaxKind): ts.Node | null;
  findAstNodes(node: ts.Node | null, kind: ts.SyntaxKind, recursive?: boolean,
    max?: number): ts.Node[];

  // Macros.
  insertImport(symbolName: string, modulePath: string): void;

  // Transpilation.
  getDiagnostics(typeCheck: boolean): ts.Diagnostic[];
  transpile(compilerOptions?: ts.CompilerOptions): TranspileOutput;
}

export interface TranspileOutput {
  outputText: string;
  sourceMap: any | null;
}

export function resolve(filePath: string, _host: ts.CompilerHost, program: ts.Program) {
  if (path.isAbsolute(filePath)) {
    return filePath;
  }
  const compilerOptions = program.getCompilerOptions();
  const basePath = compilerOptions.baseUrl || compilerOptions.rootDir;
  if (!basePath) {
    throw new Error(`Trying to resolve '${filePath}' without a basePath.`);
  }
  return path.join(basePath, filePath);
}

export function getTypeScriptFileRefactor(
  fileName: string,
  host: ts.CompilerHost,
  programManager?: ProgramManager,
  source?: string | null
): TypeScriptFileRefactor {

  const projectTypeScriptVersion = require('typescript/package.json').version;
  const transformMinTypeScriptVersion = '^2.3.0';

  if (programManager && semver.satisfies(projectTypeScriptVersion, transformMinTypeScriptVersion)) {
    return new TypeScriptFileTransformRefactor(fileName, host, programManager, source);
  } else {
    return new TypeScriptMagicStringFileRefactor(fileName, host, programManager, source);
  }
}
