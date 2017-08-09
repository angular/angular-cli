import * as fs from 'fs';
import {join} from 'path';
import * as ts from 'typescript';

import {TypeScriptFileRefactor, getTypeScriptFileRefactor} from './refactor/refactor';
import {ProgramManager} from './program_manager';


function _recursiveSymbolExportLookup(refactor: TypeScriptFileRefactor,
                                      symbolName: string,
                                      host: ts.CompilerHost,
                                      programManager: ProgramManager): string | null {
  // Check this file.
  const hasSymbol = refactor.findAstNodes(null, ts.SyntaxKind.ClassDeclaration)
    .some((cd: ts.ClassDeclaration) => {
      return cd.name && cd.name.text == symbolName;
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
      modulePath, refactor.fileName, programManager.program.getCompilerOptions(), host);
    if (!resolvedModule.resolvedModule || !resolvedModule.resolvedModule.resolvedFileName) {
      return null;
    }

    const module = resolvedModule.resolvedModule.resolvedFileName;
    if (!decl.exportClause) {
      const moduleRefactor = getTypeScriptFileRefactor(module, host, programManager);
      const maybeModule = _recursiveSymbolExportLookup(
        moduleRefactor, symbolName, host, programManager);
      if (maybeModule) {
        return maybeModule;
      }
      continue;
    }

    const binding = decl.exportClause as ts.NamedExports;
    for (const specifier of binding.elements) {
      if (specifier.name.text == symbolName) {
        // If it's a directory, load its index and recursively lookup.
        if (fs.statSync(module).isDirectory()) {
          const indexModule = join(module, 'index.ts');
          if (fs.existsSync(indexModule)) {
            const indexRefactor = getTypeScriptFileRefactor(indexModule, host, programManager);
            const maybeModule = _recursiveSymbolExportLookup(
              indexRefactor, symbolName, host, programManager);
            if (maybeModule) {
              return maybeModule;
            }
          }
        }

        // Create the source and verify that the symbol is at least a class.
        const source = getTypeScriptFileRefactor(module, host, programManager);
        const hasSymbol = source.findAstNodes(null, ts.SyntaxKind.ClassDeclaration)
          .some((cd: ts.ClassDeclaration) => {
            return cd.name && cd.name.text == symbolName;
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
                             programManager: ProgramManager): string | null {
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
      refactor.fileName, programManager.program.getCompilerOptions(), host);
    if (!resolvedModule.resolvedModule || !resolvedModule.resolvedModule.resolvedFileName) {
      continue;
    }

    const module = resolvedModule.resolvedModule.resolvedFileName;
    if (decl.importClause.namedBindings.kind == ts.SyntaxKind.NamespaceImport) {
      const binding = decl.importClause.namedBindings as ts.NamespaceImport;
      if (binding.name.text == symbolName) {
        // This is a default export.
        return module;
      }
    } else if (decl.importClause.namedBindings.kind == ts.SyntaxKind.NamedImports) {
      const binding = decl.importClause.namedBindings as ts.NamedImports;
      for (const specifier of binding.elements) {
        if (specifier.name.text == symbolName) {
          // Create the source and recursively lookup the import.
          const source = getTypeScriptFileRefactor(module, host, programManager);
          const maybeModule = _recursiveSymbolExportLookup(
            source, symbolName, host, programManager);
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
                                           programManager: ProgramManager) {
  const source = getTypeScriptFileRefactor(mainPath, host, programManager);

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

  if (bootstrap.length != 1) {
    throw new Error('Tried to find bootstrap code, but could not. Specify either '
      + 'statically analyzable bootstrap code or pass in an entryModule '
      + 'to the plugins options.');
  }
  const bootstrapSymbolName = bootstrap[0].text;
  const module = _symbolImportLookup(source, bootstrapSymbolName, host, programManager);
  if (module) {
    return `${module.replace(/\.ts$/, '')}#${bootstrapSymbolName}`;
  }

  // shrug... something bad happened and we couldn't find the import statement.
  throw new Error('Tried to find bootstrap code, but could not. Specify either '
    + 'statically analyzable bootstrap code or pass in an entryModule '
    + 'to the plugins options.');
}
