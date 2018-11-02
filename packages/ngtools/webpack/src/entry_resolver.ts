/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Path, join } from '@angular-devkit/core';
import * as ts from 'typescript';
import { TypeScriptFileRefactor } from './refactor';


function _recursiveSymbolExportLookup(refactor: TypeScriptFileRefactor,
                                      symbolName: string,
                                      host: ts.CompilerHost,
                                      program: ts.Program): string | null {
  // Check this file.
  const hasSymbol = refactor.findAstNodes(null, ts.SyntaxKind.ClassDeclaration)
    .some((cd: ts.ClassDeclaration) => {
      return cd.name != undefined && cd.name.text == symbolName;
    });
  if (hasSymbol) {
    return refactor.fileName;
  }

  // We found the bootstrap variable, now we just need to get where it's imported.
  const exports = refactor.findAstNodes(null, ts.SyntaxKind.ExportDeclaration)
    .map(node => node as ts.ExportDeclaration);

  for (const decl of exports) {
    if (!decl.moduleSpecifier || decl.moduleSpecifier.kind !== ts.SyntaxKind.StringLiteral) {
      continue;
    }

    const modulePath = (decl.moduleSpecifier as ts.StringLiteral).text;
    const resolvedModule = ts.resolveModuleName(
      modulePath, refactor.fileName, program.getCompilerOptions(), host);
    if (!resolvedModule.resolvedModule || !resolvedModule.resolvedModule.resolvedFileName) {
      return null;
    }

    const module = resolvedModule.resolvedModule.resolvedFileName;
    if (!decl.exportClause) {
      const moduleRefactor = new TypeScriptFileRefactor(module, host, program);
      const maybeModule = _recursiveSymbolExportLookup(moduleRefactor, symbolName, host, program);
      if (maybeModule) {
        return maybeModule;
      }
      continue;
    }

    const binding = decl.exportClause as ts.NamedExports;
    for (const specifier of binding.elements) {
      if (specifier.name.text == symbolName) {
        // If it's a directory, load its index and recursively lookup.
        // If it's a file it will return false
        if (host.directoryExists && host.directoryExists(module)) {
          const indexModule = join(module as Path, 'index.ts');
          if (host.fileExists(indexModule)) {
            const indexRefactor = new TypeScriptFileRefactor(indexModule, host, program);
            const maybeModule = _recursiveSymbolExportLookup(
              indexRefactor, symbolName, host, program);
            if (maybeModule) {
              return maybeModule;
            }
          }
        }

        // Create the source and verify that the symbol is at least a class.
        const source = new TypeScriptFileRefactor(module, host, program);
        const hasSymbol = source.findAstNodes(null, ts.SyntaxKind.ClassDeclaration)
          .some((cd: ts.ClassDeclaration) => {
            return cd.name != undefined && cd.name.text == symbolName;
          });

        if (hasSymbol) {
          return module;
        }
      }
    }
  }

  return null;
}

function _symbolImportLookup(refactor: TypeScriptFileRefactor,
                             symbolName: string,
                             host: ts.CompilerHost,
                             program: ts.Program): string | null {
  // We found the bootstrap variable, now we just need to get where it's imported.
  const imports = refactor.findAstNodes(null, ts.SyntaxKind.ImportDeclaration)
    .map(node => node as ts.ImportDeclaration);

  for (const decl of imports) {
    if (!decl.importClause || !decl.moduleSpecifier) {
      continue;
    }
    if (decl.moduleSpecifier.kind !== ts.SyntaxKind.StringLiteral) {
      continue;
    }

    const resolvedModule = ts.resolveModuleName(
      (decl.moduleSpecifier as ts.StringLiteral).text,
      refactor.fileName, program.getCompilerOptions(), host);
    if (!resolvedModule.resolvedModule || !resolvedModule.resolvedModule.resolvedFileName) {
      continue;
    }

    const module = resolvedModule.resolvedModule.resolvedFileName;
    if (decl.importClause.namedBindings
        && decl.importClause.namedBindings.kind == ts.SyntaxKind.NamespaceImport) {
      const binding = decl.importClause.namedBindings as ts.NamespaceImport;
      if (binding.name.text == symbolName) {
        // This is a default export.
        return module;
      }
    } else if (decl.importClause.namedBindings
               && decl.importClause.namedBindings.kind == ts.SyntaxKind.NamedImports) {
      const binding = decl.importClause.namedBindings as ts.NamedImports;
      for (const specifier of binding.elements) {
        if (specifier.name.text == symbolName) {
          // Create the source and recursively lookup the import.
          const source = new TypeScriptFileRefactor(module, host, program);
          const maybeModule = _recursiveSymbolExportLookup(source, symbolName, host, program);
          if (maybeModule) {
            return maybeModule;
          }
        }
      }
    }
  }

  return null;
}


export function resolveEntryModuleFromMain(mainPath: string,
                                           host: ts.CompilerHost,
                                           program: ts.Program): string | null {
  const source = new TypeScriptFileRefactor(mainPath, host, program);

  const bootstrap = source.findAstNodes(source.sourceFile, ts.SyntaxKind.CallExpression, true)
    .map(node => node as ts.CallExpression)
    .filter(call => {
      const access = call.expression as ts.PropertyAccessExpression;

      return access.kind == ts.SyntaxKind.PropertyAccessExpression
          && access.name.kind == ts.SyntaxKind.Identifier
          && (access.name.text == 'bootstrapModule'
              || access.name.text == 'bootstrapModuleFactory');
    })
    .map(node => node.arguments[0] as ts.Identifier)
    .filter(node => node.kind == ts.SyntaxKind.Identifier);

  if (bootstrap.length === 1) {
    const bootstrapSymbolName = bootstrap[0].text;
    const module = _symbolImportLookup(source, bootstrapSymbolName, host, program);
    if (module) {
      return `${module.replace(/\.ts$/, '')}#${bootstrapSymbolName}`;
    }
  }

  return null;
}
