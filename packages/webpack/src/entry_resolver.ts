import * as fs from 'fs';
import {dirname, join, resolve} from 'path';
import * as ts from 'typescript';


function _createSource(path: string): ts.SourceFile {
  return ts.createSourceFile(path, fs.readFileSync(path, 'utf-8'), ts.ScriptTarget.Latest);
}

function _findNodes(sourceFile: ts.SourceFile, node: ts.Node, kind: ts.SyntaxKind,
                    keepGoing = false): ts.Node[] {
  if (node.kind == kind && !keepGoing) {
    return [node];
  }

  return node.getChildren(sourceFile).reduce((result, n) => {
    return result.concat(_findNodes(sourceFile, n, kind, keepGoing));
  }, node.kind == kind ? [node] : []);
}

function _recursiveSymbolExportLookup(sourcePath: string,
                                      sourceFile: ts.SourceFile,
                                      symbolName: string): string | null {
  // Check this file.
  const hasSymbol = _findNodes(sourceFile, sourceFile, ts.SyntaxKind.ClassDeclaration)
    .some((cd: ts.ClassDeclaration) => {
      return cd.name && cd.name.text == symbolName;
    });
  if (hasSymbol) {
    return sourcePath;
  }

  // We found the bootstrap variable, now we just need to get where it's imported.
  const exports = _findNodes(sourceFile, sourceFile, ts.SyntaxKind.ExportDeclaration, false)
    .map(node => node as ts.ExportDeclaration);

  for (const decl of exports) {
    if (!decl.moduleSpecifier || decl.moduleSpecifier.kind !== ts.SyntaxKind.StringLiteral) {
      continue;
    }

    const module = resolve(dirname(sourcePath), (decl.moduleSpecifier as ts.StringLiteral).text);
    if (!decl.exportClause) {
      const moduleTs = module + '.ts';
      if (fs.existsSync(moduleTs)) {
        const moduleSource = _createSource(moduleTs);
        const maybeModule = _recursiveSymbolExportLookup(module, moduleSource, symbolName);
        if (maybeModule) {
          return maybeModule;
        }
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
            const maybeModule = _recursiveSymbolExportLookup(
              indexModule, _createSource(indexModule), symbolName);
            if (maybeModule) {
              return maybeModule;
            }
          }
        }

        // Create the source and verify that the symbol is at least a class.
        const source = _createSource(module);
        const hasSymbol = _findNodes(source, source, ts.SyntaxKind.ClassDeclaration)
          .some((cd: ts.ClassDeclaration) => {
            return cd.name && cd.name.text == symbolName;
          });

        if (hasSymbol) {
          return module;
        } else {
          return null;
        }
      }
    }
  }

  return null;
}

function _symbolImportLookup(sourcePath: string,
                             sourceFile: ts.SourceFile,
                             symbolName: string): string | null {
  // We found the bootstrap variable, now we just need to get where it's imported.
  const imports = _findNodes(sourceFile, sourceFile, ts.SyntaxKind.ImportDeclaration, false)
    .map(node => node as ts.ImportDeclaration);

  for (const decl of imports) {
    if (!decl.importClause || !decl.moduleSpecifier) {
      continue;
    }
    if (decl.moduleSpecifier.kind !== ts.SyntaxKind.StringLiteral) {
      continue;
    }

    const module = resolve(dirname(sourcePath), (decl.moduleSpecifier as ts.StringLiteral).text);

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
          // If it's a directory, load its index and recursively lookup.
          if (fs.statSync(module).isDirectory()) {
            const indexModule = join(module, 'index.ts');
            if (fs.existsSync(indexModule)) {
              const maybeModule = _recursiveSymbolExportLookup(
                indexModule, _createSource(indexModule), symbolName);
              if (maybeModule) {
                return maybeModule;
              }
            }
          }

          // Create the source and verify that the symbol is at least a class.
          const source = _createSource(module);
          const hasSymbol = _findNodes(source, source, ts.SyntaxKind.ClassDeclaration)
            .some((cd: ts.ClassDeclaration) => {
              return cd.name && cd.name.text == symbolName;
            });

          if (hasSymbol) {
            return module;
          } else {
            return null;
          }
        }
      }
    }
  }
  return null;
}


export function resolveEntryModuleFromMain(mainPath: string) {
  const source = _createSource(mainPath);

  const bootstrap = _findNodes(source, source, ts.SyntaxKind.CallExpression, false)
    .map(node => node as ts.CallExpression)
    .filter(call => {
      const access = call.expression as ts.PropertyAccessExpression;
      return access.kind == ts.SyntaxKind.PropertyAccessExpression
          && access.name.kind == ts.SyntaxKind.Identifier
          && (access.name.text == 'bootstrapModule'
              || access.name.text == 'bootstrapModuleFactory');
    });

  if (bootstrap.length != 1
    || bootstrap[0].arguments[0].kind !== ts.SyntaxKind.Identifier) {
    throw new Error('Tried to find bootstrap code, but could not. Specify either '
      + 'statically analyzable bootstrap code or pass in an entryModule '
      + 'to the plugins options.');
  }

  const bootstrapSymbolName = (bootstrap[0].arguments[0] as ts.Identifier).text;
  const module = _symbolImportLookup(mainPath, source, bootstrapSymbolName);
  if (module) {
    return `${resolve(dirname(mainPath), module)}#${bootstrapSymbolName}`;
  }

  // shrug... something bad happened and we couldn't find the import statement.
  throw new Error('Tried to find bootstrap code, but could not. Specify either '
    + 'statically analyzable bootstrap code or pass in an entryModule '
    + 'to the plugins options.');
}
