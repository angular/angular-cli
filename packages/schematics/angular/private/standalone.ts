/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { SchematicsException, Tree, UpdateRecorder } from '@angular-devkit/schematics';
import { dirname, join } from 'path';
import ts from '../third_party/github.com/Microsoft/TypeScript/lib/typescript';
import { insertImport } from '../utility/ast-utils';
import { InsertChange } from '../utility/change';

/** App config that was resolved to its source node. */
interface ResolvedAppConfig {
  /** Tree-relative path of the file containing the app config. */
  filePath: string;

  /** Node defining the app config. */
  node: ts.ObjectLiteralExpression;
}

/**
 * Checks whether the providers from a module are being imported in a `bootstrapApplication` call.
 * @param tree File tree of the project.
 * @param filePath Path of the file in which to check.
 * @param className Class name of the module to search for.
 */
export function importsProvidersFrom(tree: Tree, filePath: string, className: string): boolean {
  const sourceFile = createSourceFile(tree, filePath);
  const bootstrapCall = findBootstrapApplicationCall(sourceFile);
  const appConfig = bootstrapCall ? findAppConfig(bootstrapCall, tree, filePath) : null;
  const importProvidersFromCall = appConfig ? findImportProvidersFromCall(appConfig.node) : null;

  return !!importProvidersFromCall?.arguments.some(
    (arg) => ts.isIdentifier(arg) && arg.text === className,
  );
}

/**
 * Checks whether a providers function is being called in a `bootstrapApplication` call.
 * @param tree File tree of the project.
 * @param filePath Path of the file in which to check.
 * @param functionName Name of the function to search for.
 */
export function callsProvidersFunction(
  tree: Tree,
  filePath: string,
  functionName: string,
): boolean {
  const sourceFile = createSourceFile(tree, filePath);
  const bootstrapCall = findBootstrapApplicationCall(sourceFile);
  const appConfig = bootstrapCall ? findAppConfig(bootstrapCall, tree, filePath) : null;
  const providersLiteral = appConfig ? findProvidersLiteral(appConfig.node) : null;

  return !!providersLiteral?.elements.some(
    (el) =>
      ts.isCallExpression(el) &&
      ts.isIdentifier(el.expression) &&
      el.expression.text === functionName,
  );
}

/**
 * Adds an `importProvidersFrom` call to the `bootstrapApplication` call.
 * @param tree File tree of the project.
 * @param filePath Path to the file that should be updated.
 * @param moduleName Name of the module that should be imported.
 * @param modulePath Path from which to import the module.
 */
export function addModuleImportToStandaloneBootstrap(
  tree: Tree,
  filePath: string,
  moduleName: string,
  modulePath: string,
) {
  const sourceFile = createSourceFile(tree, filePath);
  const bootstrapCall = findBootstrapApplicationCall(sourceFile);
  const addImports = (file: ts.SourceFile, recorder: UpdateRecorder) => {
    const sourceText = file.getText();

    [
      insertImport(file, sourceText, moduleName, modulePath),
      insertImport(file, sourceText, 'importProvidersFrom', '@angular/core'),
    ].forEach((change) => {
      if (change instanceof InsertChange) {
        recorder.insertLeft(change.pos, change.toAdd);
      }
    });
  };

  if (!bootstrapCall) {
    throw new SchematicsException(`Could not find bootstrapApplication call in ${filePath}`);
  }

  const importProvidersCall = ts.factory.createCallExpression(
    ts.factory.createIdentifier('importProvidersFrom'),
    [],
    [ts.factory.createIdentifier(moduleName)],
  );

  // If there's only one argument, we have to create a new object literal.
  if (bootstrapCall.arguments.length === 1) {
    const recorder = tree.beginUpdate(filePath);
    addNewAppConfigToCall(bootstrapCall, importProvidersCall, recorder);
    addImports(sourceFile, recorder);
    tree.commitUpdate(recorder);

    return;
  }

  // If the config is a `mergeApplicationProviders` call, add another config to it.
  if (isMergeAppConfigCall(bootstrapCall.arguments[1])) {
    const recorder = tree.beginUpdate(filePath);
    addNewAppConfigToCall(bootstrapCall.arguments[1], importProvidersCall, recorder);
    addImports(sourceFile, recorder);
    tree.commitUpdate(recorder);

    return;
  }

  // Otherwise attempt to merge into the current config.
  const appConfig = findAppConfig(bootstrapCall, tree, filePath);

  if (!appConfig) {
    throw new SchematicsException(
      `Could not statically analyze config in bootstrapApplication call in ${filePath}`,
    );
  }

  const { filePath: configFilePath, node: config } = appConfig;
  const recorder = tree.beginUpdate(configFilePath);
  const importCall = findImportProvidersFromCall(config);

  addImports(config.getSourceFile(), recorder);

  if (importCall) {
    // If there's an `importProvidersFrom` call already, add the module to it.
    recorder.insertRight(
      importCall.arguments[importCall.arguments.length - 1].getEnd(),
      `, ${moduleName}`,
    );
  } else {
    const providersLiteral = findProvidersLiteral(config);

    if (providersLiteral) {
      // If there's a `providers` array, add the import to it.
      addElementToArray(providersLiteral, importProvidersCall, recorder);
    } else {
      // Otherwise add a `providers` array to the existing object literal.
      addProvidersToObjectLiteral(config, importProvidersCall, recorder);
    }
  }

  tree.commitUpdate(recorder);
}

/**
 * Adds a providers function call to the `bootstrapApplication` call.
 * @param tree File tree of the project.
 * @param filePath Path to the file that should be updated.
 * @param functionName Name of the function that should be called.
 * @param importPath Path from which to import the function.
 * @param args Arguments to use when calling the function.
 * @returns The file path that the provider was added to.
 */
export function addFunctionalProvidersToStandaloneBootstrap(
  tree: Tree,
  filePath: string,
  functionName: string,
  importPath: string,
  args: ts.Expression[] = [],
): string {
  const sourceFile = createSourceFile(tree, filePath);
  const bootstrapCall = findBootstrapApplicationCall(sourceFile);
  const addImports = (file: ts.SourceFile, recorder: UpdateRecorder) => {
    const change = insertImport(file, file.getText(), functionName, importPath);

    if (change instanceof InsertChange) {
      recorder.insertLeft(change.pos, change.toAdd);
    }
  };

  if (!bootstrapCall) {
    throw new SchematicsException(`Could not find bootstrapApplication call in ${filePath}`);
  }

  const providersCall = ts.factory.createCallExpression(
    ts.factory.createIdentifier(functionName),
    undefined,
    args,
  );

  // If there's only one argument, we have to create a new object literal.
  if (bootstrapCall.arguments.length === 1) {
    const recorder = tree.beginUpdate(filePath);
    addNewAppConfigToCall(bootstrapCall, providersCall, recorder);
    addImports(sourceFile, recorder);
    tree.commitUpdate(recorder);

    return filePath;
  }

  // If the config is a `mergeApplicationProviders` call, add another config to it.
  if (isMergeAppConfigCall(bootstrapCall.arguments[1])) {
    const recorder = tree.beginUpdate(filePath);
    addNewAppConfigToCall(bootstrapCall.arguments[1], providersCall, recorder);
    addImports(sourceFile, recorder);
    tree.commitUpdate(recorder);

    return filePath;
  }

  // Otherwise attempt to merge into the current config.
  const appConfig = findAppConfig(bootstrapCall, tree, filePath);

  if (!appConfig) {
    throw new SchematicsException(
      `Could not statically analyze config in bootstrapApplication call in ${filePath}`,
    );
  }

  const { filePath: configFilePath, node: config } = appConfig;
  const recorder = tree.beginUpdate(configFilePath);
  const providersLiteral = findProvidersLiteral(config);

  addImports(config.getSourceFile(), recorder);

  if (providersLiteral) {
    // If there's a `providers` array, add the import to it.
    addElementToArray(providersLiteral, providersCall, recorder);
  } else {
    // Otherwise add a `providers` array to the existing object literal.
    addProvidersToObjectLiteral(config, providersCall, recorder);
  }

  tree.commitUpdate(recorder);

  return configFilePath;
}

/** Finds the call to `bootstrapApplication` within a file. */
export function findBootstrapApplicationCall(sourceFile: ts.SourceFile): ts.CallExpression | null {
  const localName = findImportLocalName(
    sourceFile,
    'bootstrapApplication',
    '@angular/platform-browser',
  );

  if (!localName) {
    return null;
  }

  let result: ts.CallExpression | null = null;

  sourceFile.forEachChild(function walk(node) {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === localName
    ) {
      result = node;
    }

    if (!result) {
      node.forEachChild(walk);
    }
  });

  return result;
}

/** Find a call to `importProvidersFrom` within an application config. */
function findImportProvidersFromCall(config: ts.ObjectLiteralExpression): ts.CallExpression | null {
  const importProvidersName = findImportLocalName(
    config.getSourceFile(),
    'importProvidersFrom',
    '@angular/core',
  );
  const providersLiteral = findProvidersLiteral(config);

  if (providersLiteral && importProvidersName) {
    for (const element of providersLiteral.elements) {
      // Look for an array element that calls the `importProvidersFrom` function.
      if (
        ts.isCallExpression(element) &&
        ts.isIdentifier(element.expression) &&
        element.expression.text === importProvidersName
      ) {
        return element;
      }
    }
  }

  return null;
}

/** Finds the `providers` array literal within an application config. */
function findProvidersLiteral(
  config: ts.ObjectLiteralExpression,
): ts.ArrayLiteralExpression | null {
  for (const prop of config.properties) {
    if (
      ts.isPropertyAssignment(prop) &&
      ts.isIdentifier(prop.name) &&
      prop.name.text === 'providers' &&
      ts.isArrayLiteralExpression(prop.initializer)
    ) {
      return prop.initializer;
    }
  }

  return null;
}

/**
 * Resolves the node that defines the app config from a bootstrap call.
 * @param bootstrapCall Call for which to resolve the config.
 * @param tree File tree of the project.
 * @param filePath File path of the bootstrap call.
 */
function findAppConfig(
  bootstrapCall: ts.CallExpression,
  tree: Tree,
  filePath: string,
): ResolvedAppConfig | null {
  if (bootstrapCall.arguments.length > 1) {
    const config = bootstrapCall.arguments[1];

    if (ts.isObjectLiteralExpression(config)) {
      return { filePath, node: config };
    }

    if (ts.isIdentifier(config)) {
      return resolveAppConfigFromIdentifier(config, tree, filePath);
    }
  }

  return null;
}

/**
 * Resolves the app config from an identifier referring to it.
 * @param identifier Identifier referring to the app config.
 * @param tree File tree of the project.
 * @param bootstapFilePath Path of the bootstrap call.
 */
function resolveAppConfigFromIdentifier(
  identifier: ts.Identifier,
  tree: Tree,
  bootstapFilePath: string,
): ResolvedAppConfig | null {
  const sourceFile = identifier.getSourceFile();

  for (const node of sourceFile.statements) {
    // Only look at relative imports. This will break if the app uses a path
    // mapping to refer to the import, but in order to resolve those, we would
    // need knowledge about the entire program.
    if (
      !ts.isImportDeclaration(node) ||
      !node.importClause?.namedBindings ||
      !ts.isNamedImports(node.importClause.namedBindings) ||
      !ts.isStringLiteralLike(node.moduleSpecifier) ||
      !node.moduleSpecifier.text.startsWith('.')
    ) {
      continue;
    }

    for (const specifier of node.importClause.namedBindings.elements) {
      if (specifier.name.text !== identifier.text) {
        continue;
      }

      // Look for a variable with the imported name in the file. Note that ideally we would use
      // the type checker to resolve this, but we can't because these utilities are set up to
      // operate on individual files, not the entire program.
      const filePath = join(dirname(bootstapFilePath), node.moduleSpecifier.text + '.ts');
      const importedSourceFile = createSourceFile(tree, filePath);
      const resolvedVariable = findAppConfigFromVariableName(
        importedSourceFile,
        (specifier.propertyName || specifier.name).text,
      );

      if (resolvedVariable) {
        return { filePath, node: resolvedVariable };
      }
    }
  }

  const variableInSameFile = findAppConfigFromVariableName(sourceFile, identifier.text);

  return variableInSameFile ? { filePath: bootstapFilePath, node: variableInSameFile } : null;
}

/**
 * Finds an app config within the top-level variables of a file.
 * @param sourceFile File in which to search for the config.
 * @param variableName Name of the variable containing the config.
 */
function findAppConfigFromVariableName(
  sourceFile: ts.SourceFile,
  variableName: string,
): ts.ObjectLiteralExpression | null {
  for (const node of sourceFile.statements) {
    if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (
          ts.isIdentifier(decl.name) &&
          decl.name.text === variableName &&
          decl.initializer &&
          ts.isObjectLiteralExpression(decl.initializer)
        ) {
          return decl.initializer;
        }
      }
    }
  }

  return null;
}

/**
 * Finds the local name of an imported symbol. Could be the symbol name itself or its alias.
 * @param sourceFile File within which to search for the import.
 * @param name Actual name of the import, not its local alias.
 * @param moduleName Name of the module from which the symbol is imported.
 */
function findImportLocalName(
  sourceFile: ts.SourceFile,
  name: string,
  moduleName: string,
): string | null {
  for (const node of sourceFile.statements) {
    // Only look for top-level imports.
    if (
      !ts.isImportDeclaration(node) ||
      !ts.isStringLiteral(node.moduleSpecifier) ||
      node.moduleSpecifier.text !== moduleName
    ) {
      continue;
    }

    // Filter out imports that don't have the right shape.
    if (
      !node.importClause ||
      !node.importClause.namedBindings ||
      !ts.isNamedImports(node.importClause.namedBindings)
    ) {
      continue;
    }

    // Look through the elements of the declaration for the specific import.
    for (const element of node.importClause.namedBindings.elements) {
      if ((element.propertyName || element.name).text === name) {
        // The local name is always in `name`.
        return element.name.text;
      }
    }
  }

  return null;
}

/** Creates a source file from a file path within a project. */
function createSourceFile(tree: Tree, filePath: string): ts.SourceFile {
  return ts.createSourceFile(filePath, tree.readText(filePath), ts.ScriptTarget.Latest, true);
}

/**
 * Creates a new app config object literal and adds it to a call expression as an argument.
 * @param call Call to which to add the config.
 * @param expression Expression that should inserted into the new config.
 * @param recorder Recorder to which to log the change.
 */
function addNewAppConfigToCall(
  call: ts.CallExpression,
  expression: ts.Expression,
  recorder: UpdateRecorder,
): void {
  const newCall = ts.factory.updateCallExpression(call, call.expression, call.typeArguments, [
    ...call.arguments,
    ts.factory.createObjectLiteralExpression(
      [
        ts.factory.createPropertyAssignment(
          'providers',
          ts.factory.createArrayLiteralExpression([expression]),
        ),
      ],
      true,
    ),
  ]);

  recorder.remove(call.getStart(), call.getWidth());
  recorder.insertRight(
    call.getStart(),
    ts.createPrinter().printNode(ts.EmitHint.Unspecified, newCall, call.getSourceFile()),
  );
}

/**
 * Adds an element to an array literal expression.
 * @param node Array to which to add the element.
 * @param element Element to be added.
 * @param recorder Recorder to which to log the change.
 */
function addElementToArray(
  node: ts.ArrayLiteralExpression,
  element: ts.Expression,
  recorder: UpdateRecorder,
): void {
  const newLiteral = ts.factory.updateArrayLiteralExpression(node, [...node.elements, element]);
  recorder.remove(node.getStart(), node.getWidth());
  recorder.insertRight(
    node.getStart(),
    ts.createPrinter().printNode(ts.EmitHint.Unspecified, newLiteral, node.getSourceFile()),
  );
}

/**
 * Adds a `providers` property to an object literal.
 * @param node Literal to which to add the `providers`.
 * @param expression Provider that should be part of the generated `providers` array.
 * @param recorder Recorder to which to log the change.
 */
function addProvidersToObjectLiteral(
  node: ts.ObjectLiteralExpression,
  expression: ts.Expression,
  recorder: UpdateRecorder,
) {
  const newOptionsLiteral = ts.factory.updateObjectLiteralExpression(node, [
    ...node.properties,
    ts.factory.createPropertyAssignment(
      'providers',
      ts.factory.createArrayLiteralExpression([expression]),
    ),
  ]);
  recorder.remove(node.getStart(), node.getWidth());
  recorder.insertRight(
    node.getStart(),
    ts.createPrinter().printNode(ts.EmitHint.Unspecified, newOptionsLiteral, node.getSourceFile()),
  );
}

/** Checks whether a node is a call to `mergeApplicationConfig`. */
function isMergeAppConfigCall(node: ts.Node): node is ts.CallExpression {
  if (!ts.isCallExpression(node)) {
    return false;
  }

  const localName = findImportLocalName(
    node.getSourceFile(),
    'mergeApplicationConfig',
    '@angular/core',
  );

  return !!localName && ts.isIdentifier(node.expression) && node.expression.text === localName;
}
