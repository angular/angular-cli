/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';
import { WebpackCompilerHost } from './compiler_host';

/**
 * Helper functions for computing dependencies.
 */
export class DependencyFinder {
  alreadySeen = new Set<string>();
  dependencies = new Set<string>();

  constructor (private _compilerHost: WebpackCompilerHost & ts.CompilerHost, private scriptTarget: ts.ScriptTarget) {}

  collectDependencies(resolvedFile: string): void {
    this.recursivelyCollectDependencies(resolvedFile);
  }

  protected recursivelyCollectDependencies(filePath: string): void {
    console.log('collecting', filePath);
    const sf = this._compilerHost.getSourceFile(filePath, this.scriptTarget);
    if (sf === undefined) {
      return;
    }
    const imports = this.extractImports(sf);
    for (const importPath of imports) {
      this.processImport(importPath, filePath);
    }
  }

  protected processImport(importPath: string, file: string): void {
    const [resolvedModule] = this._compilerHost.resolveModuleNames([importPath], file);

    if (resolvedModule === undefined) {
      return;
    }

    console.log(resolvedModule);

    if (resolvedModule.isExternalLibraryImport || resolvedModule.extension === '.d.ts') {
      this.dependencies.add(importPath);
    } else {
      const internalDependency = resolvedModule.resolvedFileName;
      console.log('internal dep', internalDependency);
      if (!this.alreadySeen.has(internalDependency)) {
        this.alreadySeen.add(internalDependency);
        this.recursivelyCollectDependencies(internalDependency);
      }
    }
  }

  protected extractImports(sf: ts.SourceFile): Set<string> {
    return new Set(sf.statements
        // filter out statements that are not imports or reexports
        .filter(isStringImportOrReexport)
        // Grab the id of the module that is being imported
        .map(stmt => stmt.moduleSpecifier.text));
  }
}

/**
 * Check whether the given statement is an import with a string literal module specifier.
 * @param stmt the statement node to check.
 * @returns true if the statement is an import with a string literal module specifier.
 */
export function isStringImportOrReexport(stmt: ts.Statement): stmt is ts.ImportDeclaration&
    {moduleSpecifier: ts.StringLiteral} {
  return ts.isImportDeclaration(stmt) ||
      ts.isExportDeclaration(stmt) && !!stmt.moduleSpecifier &&
      ts.isStringLiteral(stmt.moduleSpecifier);
}