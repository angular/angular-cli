/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { SchematicsException, Tree } from '@angular-devkit/schematics';
import ts from '../../third_party/github.com/Microsoft/TypeScript/lib/typescript';
import { Change, applyToUpdateRecorder } from '../change';
import { targetBuildNotFoundError } from '../project-targets';
import { getWorkspace } from '../workspace';
import { Builders } from '../workspace-models';

/**
 * Finds the main file of a project.
 * @param tree File tree for the project.
 * @param projectName Name of the project in which to search.
 */
export async function getMainFilePath(tree: Tree, projectName: string): Promise<string> {
  const workspace = await getWorkspace(tree);
  const project = workspace.projects.get(projectName);
  const buildTarget = project?.targets.get('build');

  if (!buildTarget) {
    throw targetBuildNotFoundError();
  }

  const options = buildTarget.options as Record<string, string>;

  return buildTarget.builder === Builders.Application ? options.browser : options.main;
}

/**
 * Gets a TypeScript source file at a specific path.
 * @param tree File tree of a project.
 * @param path Path to the file.
 */
export function getSourceFile(tree: Tree, path: string): ts.SourceFile {
  const content = tree.readText(path);
  const source = ts.createSourceFile(path, content, ts.ScriptTarget.Latest, true);

  return source;
}

/** Finds the call to `bootstrapApplication` within a file. */
export function findBootstrapApplicationCall(tree: Tree, mainFilePath: string): ts.CallExpression {
  const sourceFile = getSourceFile(tree, mainFilePath);
  const localName = findImportLocalName(
    sourceFile,
    'bootstrapApplication',
    '@angular/platform-browser',
  );

  if (localName) {
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

    if (result) {
      return result;
    }
  }

  throw new SchematicsException(`Could not find bootstrapApplication call in ${mainFilePath}`);
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

/**
 * Applies a set of changes to a file.
 * @param tree File tree of the project.
 * @param path Path to the file that is being changed.
 * @param changes Changes that should be applied to the file.
 */
export function applyChangesToFile(tree: Tree, path: string, changes: Change[]) {
  if (changes.length > 0) {
    const recorder = tree.beginUpdate(path);
    applyToUpdateRecorder(recorder, changes);
    tree.commitUpdate(recorder);
  }
}

/** Checks whether a node is a call to `mergeApplicationConfig`. */
export function isMergeAppConfigCall(node: ts.Node): node is ts.CallExpression {
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

/** Finds the `providers` array literal within an application config. */
export function findProvidersLiteral(
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
