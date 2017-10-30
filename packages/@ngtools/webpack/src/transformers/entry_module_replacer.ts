import * as ts from 'typescript';
import {
  cleanupImport,
  createNamespaceImport,
  createSingleImport,
  fixupNodeSymbol,
  getDeclarations,
} from './utilities';

export type ModuleResolver =
  (moduleText: string, containingFile: string) => string | undefined;

export class EntryModuleReplacerOptions {
  factoryClassSuffix? = 'NgFactory';
  factoryPathSuffix? = '.ngfactory';
  resolveModule?: ModuleResolver = moduleText => moduleText;
  onEntryFound?: (entryPath: string, entryClass: string, containingFile: string) => void;
}

interface ImportDescription {
  readonly name: string;
  readonly module: string;
  readonly node: ts.ImportSpecifier | ts.NamespaceImport;
  readonly isNamespace?: boolean;
}

interface ImportInfo {
  moduleText: string;
  modulePath: string;
  name: string;
}

export function createEntryModuleReplacer(
  getTypeChecker: () => ts.TypeChecker,
  options?: EntryModuleReplacerOptions
): ts.TransformerFactory<ts.SourceFile> {
  options = { ...(new EntryModuleReplacerOptions()), ...options };

  let typeChecker: ts.TypeChecker | undefined;
  let moduleKind: ts.ModuleKind;
  let currentSourceFileName: string | null;
  const relevantImports = new Map<ts.Declaration, ImportDescription>();
  const newImports = new Set<ts.ImportDeclaration>();
  let removableImports: Set<ts.Declaration> | null;

  function notifyEntryFound(entryPath: string, entryClass: string) {
    if (options.onEntryFound) {
      options.onEntryFound(entryPath, entryClass, currentSourceFileName);
    }
  }

  function getRelevantImports(identifier: ts.Identifier): Array<ImportDescription> {
    return getDeclarations(identifier, typeChecker)
      .filter(dec => relevantImports.has(dec))
      .map(dec => relevantImports.get(dec));
  }

  function getImportInfo(expression: ts.Expression): ImportInfo | undefined {
    let name: string;
    let importDeclarations: Array<ts.ImportDeclaration>;

    if (ts.isIdentifier(expression)) {
      // direct import
      name = expression.text;
      importDeclarations = getDeclarations(expression, typeChecker)
        .filter(ts.isImportSpecifier)
        .map(specifier => specifier.parent.parent.parent);
    } else if (ts.isPropertyAccessExpression(expression)
               && ts.isIdentifier(expression.expression)) {
      // namespace import
      name = expression.name.text;
      importDeclarations = getDeclarations(expression.expression, typeChecker)
        .filter(ts.isNamespaceImport)
        .map(ni => ni.parent.parent);
    } else {
      return undefined;
    }

    const importPaths = importDeclarations
      .map(dec => dec.moduleSpecifier)
      .filter(ts.isStringLiteral)
      .map(literal => literal.text);

    if (importPaths.length === 0) {
      return undefined;
    }

    const moduleText = importPaths[0];
    const modulePath = options.resolveModule(moduleText, currentSourceFileName);

    return { moduleText, modulePath, name };
  }

  function createTargetExpression(module: string, name: string): ts.Expression {
    // create an additional import; added to source file after full visit
    const uniqueName = ts.createUniqueName(name);
    if (moduleKind === ts.ModuleKind.CommonJS) {
      newImports.add(createNamespaceImport(module, uniqueName));
      return ts.createPropertyAccess(uniqueName, name);
    } else {
      newImports.add(createSingleImport(module, name, uniqueName));
      return uniqueName;
    }
  }

  function findReplacement(description: ImportDescription) {
    if (description.module === '@angular/platform-browser-dynamic') {
      return {
        module: '@angular/platform-browser',
        platform: 'platformBrowser',
        action: 'bootstrapModuleFactory'
      };
    }

    return undefined;
  }

  function visitCallTarget(node: ts.Expression): ts.VisitResult<ts.Expression> {
    if (!ts.isPropertyAccessExpression(node)) {
      return node;
    }

    const propertySource = node.expression;
    if (ts.isCallExpression(propertySource)
        && propertySource.arguments.length === 0) {
      // potential platform factory call

      let identifier: ts.Identifier;
      if (ts.isIdentifier(propertySource.expression)) {
        // potential named import call
        identifier = propertySource.expression;
      } else if (ts.isPropertyAccessExpression(propertySource.expression)
                  && ts.isIdentifier(propertySource.expression.expression)) {
        // potential namespace import call
        identifier = propertySource.expression.expression;
      }

      if (!identifier) {
        // unsupported or not relevant
        return node;
      }

      const relevant = getRelevantImports(identifier);

      if (relevant.length > 0) {
        // platform factory call
        const replacement = findReplacement(relevant[0]);
        if (!replacement) {
          // no replacement found
          return node;
        }

        return ts.updatePropertyAccess(
          node,
          ts.updateCall(
            propertySource,
            createTargetExpression(replacement.module, replacement.platform),
            undefined,
            []
          ),
          ts.createIdentifier(replacement.action)
        );
      }
    }

    return node;
  }

  function isPotentialBootstrapCall(node: ts.Node): node is ts.CallExpression {
    if (!ts.isCallExpression(node)) {
      return false;
    }

    // bootstrap calls have 1-2 arguments
    if (node.arguments.length === 0 || node.arguments.length > 2) {
      return false;
    }

    const arg0 = node.arguments[0];

    // support identifiers as first argument
    if (arg0.kind === ts.SyntaxKind.Identifier) {
      return true;
    }

    // support potential namespace property access
    if (ts.isPropertyAccessExpression(arg0)
        && arg0.expression.kind === ts.SyntaxKind.Identifier) {
      return true;
    }

    return false;
  }

  const transformerFactory = (context: ts.TransformationContext) => {
    typeChecker = getTypeChecker();
    if (!typeChecker) {
      throw new Error('TypeScript type checker is required.');
    }
    moduleKind = context.getCompilerOptions().module;

    function visit(node: ts.Node): ts.VisitResult<ts.Node> {
      if (ts.isImportDeclaration(node)) {
        return node;
      }

      if (ts.isIdentifier(node) && removableImports.size > 0) {
        // record used imports
        getDeclarations(node, typeChecker)
          .forEach(dec => removableImports.delete(dec));
      }

      if (isPotentialBootstrapCall(node)) {
        const updatedEntryTarget = ts.visitNode(node.expression, visitCallTarget);
        if (updatedEntryTarget !== node.expression) {
          // presence of first argument has already been checked
          const classImportInfo = getImportInfo(node.arguments[0]);

          if (classImportInfo) {
            notifyEntryFound(classImportInfo.modulePath, classImportInfo.name);
            // call target expression was updated so update the call itself
            // swap in the factory argument and add import as well
            const factoryClassName = classImportInfo.name + options.factoryClassSuffix;
            const factoryPath = classImportInfo.modulePath + options.factoryPathSuffix;
            const argExpression = createTargetExpression(factoryPath, factoryClassName);

            node = ts.updateCall(
              node,
              updatedEntryTarget,
              undefined,
              [ argExpression, ...node.arguments.slice(1) ]
            );
          }
        }
      }

      return ts.visitEachChild(node, visit, context);
    }

    function findEntryImports(node: ts.Node): void {
      if (!ts.isImportDeclaration(node)) {
        return;
      }

      if (!node.moduleSpecifier
          || !ts.isStringLiteral(node.moduleSpecifier)
          || !node.importClause
          || !node.importClause.namedBindings) {
        return;
      }

      const module = node.moduleSpecifier.text;
      if (module === '@angular/platform-browser-dynamic') {
        if (ts.isNamespaceImport(node.importClause.namedBindings)) {
          relevantImports.set(node.importClause.namedBindings, {
            node: node.importClause.namedBindings,
            name: node.importClause.namedBindings.name.text,
            isNamespace: true,
            module
          });
        } else {
          node.importClause.namedBindings.elements
            .map(el => ({
              node: el,
              name: (el.propertyName || el.name).text,
              module
            }))
            .filter(desc => desc.name === 'platformBrowserDynamic')
            .forEach(desc => relevantImports.set(desc.node, desc));
        }
      }

    }

    return (file: ts.SourceFile) => {
      currentSourceFileName = file.fileName;

      // try to find any entry related imports
      ts.forEachChild(file, findEntryImports);
      if (relevantImports.size === 0) {
        // no changes needed
        return file;
      }

      removableImports = new Set(relevantImports.keys());

      let result = ts.visitEachChild(file, visit, context);

      if (newImports.size > 0 || removableImports.size > 0) {
        const importVisitor = (node: ts.Node) => {
          if (!ts.isImportDeclaration(node)) {
            return node;
          }
          return cleanupImport(node, dec => removableImports.has(dec));
        };
        const statements = ts.visitNodes(result.statements, importVisitor);
        const insertionPoint = statements
          .findIndex(s => !(ts.isExpressionStatement(s) && ts.isStringLiteral(s.expression)));

        statements.splice(insertionPoint, 0, ...newImports);

        result = ts.updateSourceFileNode(
          result,
          statements
        );

        newImports.clear();
      }

      // cleanup
      relevantImports.clear();
      removableImports = null;
      currentSourceFileName = null;

      return fixupNodeSymbol(result);
    };
  };

  return transformerFactory;
}
