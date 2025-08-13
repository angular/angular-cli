/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { ImportSpecifier, Node, SourceFile } from 'typescript';
import { createUnsupportedZoneUsagesMessage } from './prompts';
import { getImportSpecifier, loadTypescript } from './ts_utils';
import { MigrationResponse } from './types';

export async function analyzeForUnsupportedZoneUses(
  sourceFile: SourceFile,
): Promise<MigrationResponse | null> {
  const ngZoneImport = await getImportSpecifier(sourceFile, '@angular/core', 'NgZone');
  if (!ngZoneImport) {
    return null;
  }
  const unsupportedUsages = await findUnsupportedZoneUsages(sourceFile, ngZoneImport);

  if (unsupportedUsages.length === 0) {
    return null;
  }

  const locations = unsupportedUsages.map((node: Node) => {
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());

    return `line ${line + 1}, character ${character + 1}: ${node.getText()}`;
  });

  return createUnsupportedZoneUsagesMessage(locations, sourceFile.fileName);
}

/**
 * Finds usages of `NgZone` that are not supported in zoneless applications.
 * @param sourceFile The source file to check.
 * @param ngZoneImport The import specifier for `NgZone`.
 * @returns A list of nodes that are unsupported `NgZone` usages.
 */
export async function findUnsupportedZoneUsages(
  sourceFile: SourceFile,
  ngZoneImport: ImportSpecifier,
): Promise<Node[]> {
  const unsupportedUsages: Node[] = [];
  const ngZoneClassName = ngZoneImport.name.text;

  const staticMethods = new Set([
    'isInAngularZone',
    'assertInAngularZone',
    'assertNotInAngularZone',
  ]);
  const instanceMethods = new Set(['onMicrotaskEmpty', 'onStable']);

  const ts = await loadTypescript();
  ts.forEachChild(sourceFile, function visit(node) {
    if (ts.isPropertyAccessExpression(node)) {
      const propertyName = node.name.text;
      const expressionText = node.expression.getText(sourceFile);

      // Static: NgZone.method()
      if (expressionText === ngZoneClassName && staticMethods.has(propertyName)) {
        unsupportedUsages.push(node);
      }

      // Instance: zone.method() or this.zone.method()
      if (instanceMethods.has(propertyName)) {
        unsupportedUsages.push(node);
      }
    }
    ts.forEachChild(node, visit);
  });

  return unsupportedUsages;
}
