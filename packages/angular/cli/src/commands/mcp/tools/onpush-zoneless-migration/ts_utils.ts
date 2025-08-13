/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import * as fs from 'fs';
import ts from 'typescript';

/**
 * Gets a top-level import specifier with a specific name that is imported from a particular module.
 * E.g. given a file that looks like:
 *
 * ```ts
 * import { Component, Directive } from '@angular/core';
 * import { Foo } from './foo';
 * ```
 *
 * Calling `getImportSpecifier(sourceFile, '@angular/core', 'Directive')` will yield the node
 * referring to `Directive` in the top import.
 *
 * @param sourceFile File in which to look for imports.
 * @param moduleName Name of the import's module.
 * @param specifierName Original name of the specifier to look for. Aliases will be resolved to
 *    their original name.
 */
export function getImportSpecifier(
  sourceFile: ts.SourceFile,
  moduleName: string | RegExp,
  specifierName: string,
): ts.ImportSpecifier | null {
  return getImportSpecifiers(sourceFile, moduleName, specifierName)[0] ?? null;
}

/**
 * Gets top-level import specifiers with specific names that are imported from a particular module.
 * E.g. given a file that looks like:
 *
 * ```ts
 * import { Component, Directive } from '@angular/core';
 * import { Foo } from './foo';
 * ```
 *
 * Calling `getImportSpecifiers(sourceFile, '@angular/core', ['Directive', 'Component'])` will
 * yield the nodes referring to `Directive` and `Component` in the top import.
 *
 * @param sourceFile File in which to look for imports.
 * @param moduleName Name of the import's module.
 * @param specifierOrSpecifiers Original name of the specifier to look for, or an array of such
 *   names. Aliases will be resolved to their original name.
 */
export function getImportSpecifiers(
  sourceFile: ts.SourceFile,
  moduleName: string | RegExp,
  specifierOrSpecifiers: string | string[],
): ts.ImportSpecifier[] {
  const matches: ts.ImportSpecifier[] = [];
  for (const node of sourceFile.statements) {
    if (!ts.isImportDeclaration(node) || !ts.isStringLiteral(node.moduleSpecifier)) {
      continue;
    }

    const namedBindings = node.importClause?.namedBindings;
    const isMatch =
      typeof moduleName === 'string'
        ? node.moduleSpecifier.text === moduleName
        : moduleName.test(node.moduleSpecifier.text);

    if (!isMatch || !namedBindings || !ts.isNamedImports(namedBindings)) {
      continue;
    }

    if (typeof specifierOrSpecifiers === 'string') {
      const match = findImportSpecifier(namedBindings.elements, specifierOrSpecifiers);
      if (match) {
        matches.push(match);
      }
    } else {
      for (const specifierName of specifierOrSpecifiers) {
        const match = findImportSpecifier(namedBindings.elements, specifierName);
        if (match) {
          matches.push(match);
        }
      }
    }
  }

  return matches;
}

/**
 * Finds an import specifier with a particular name.
 * @param nodes Array of import specifiers to search through.
 * @param specifierName Name of the specifier to look for.
 */
export function findImportSpecifier(
  nodes: ts.NodeArray<ts.ImportSpecifier>,
  specifierName: string,
): ts.ImportSpecifier | undefined {
  return nodes.find((element) => {
    const { name, propertyName } = element;

    return propertyName ? propertyName.text === specifierName : name.text === specifierName;
  });
}

/** Creates a TypeScript source file from a file path. */
export function createSourceFile(file: string) {
  const content = fs.readFileSync(file, 'utf8');

  return ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true);
}
