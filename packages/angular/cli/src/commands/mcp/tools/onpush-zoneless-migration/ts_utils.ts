/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import * as fs from 'node:fs';
import type { ImportSpecifier, NodeArray, SourceFile } from 'typescript';
import type ts from 'typescript';

let typescriptModule: typeof ts;

export async function loadTypescript(): Promise<typeof ts> {
  return (typescriptModule ??= await import('typescript'));
}

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
export async function getImportSpecifier(
  sourceFile: SourceFile,
  moduleName: string | RegExp,
  specifierName: string,
): Promise<ImportSpecifier | null> {
  return (
    getImportSpecifiers(sourceFile, moduleName, specifierName, await loadTypescript())[0] ?? null
  );
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
function getImportSpecifiers(
  sourceFile: SourceFile,
  moduleName: string | RegExp,
  specifierOrSpecifiers: string | string[],
  { isNamedImports, isImportDeclaration, isStringLiteral }: typeof ts,
): ImportSpecifier[] {
  const matches: ImportSpecifier[] = [];
  for (const node of sourceFile.statements) {
    if (!isImportDeclaration(node) || !isStringLiteral(node.moduleSpecifier)) {
      continue;
    }

    const namedBindings = node.importClause?.namedBindings;
    const isMatch =
      typeof moduleName === 'string'
        ? node.moduleSpecifier.text === moduleName
        : moduleName.test(node.moduleSpecifier.text);

    if (!isMatch || !namedBindings || !isNamedImports(namedBindings)) {
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
  nodes: NodeArray<ImportSpecifier>,
  specifierName: string,
): ImportSpecifier | undefined {
  return nodes.find((element) => {
    const { name, propertyName } = element;

    return propertyName ? propertyName.text === specifierName : name.text === specifierName;
  });
}

/** Creates a TypeScript source file from a file path. */
export async function createSourceFile(file: string) {
  const content = fs.readFileSync(file, 'utf8');

  const ts = await loadTypescript();

  return ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true);
}
