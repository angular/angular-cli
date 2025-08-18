/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import ts from 'typescript';
import { createUnsupportedZoneUsagesMessage } from './prompts';
import { getImportSpecifier } from './ts_utils';
import { MigrationResponse } from './types';

export function analyzeForUnsupportedZoneUses(sourceFile: ts.SourceFile): MigrationResponse | null {
  const ngZoneImport = getImportSpecifier(sourceFile, '@angular/core', 'NgZone');
  if (!ngZoneImport) {
    return null;
  }
  const unsupportedUsages = findUnsupportedZoneUsages(sourceFile, ngZoneImport);

  if (unsupportedUsages.length === 0) {
    return null;
  }

  const locations = unsupportedUsages.map((node: ts.Node) => {
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
export function findUnsupportedZoneUsages(
  sourceFile: ts.SourceFile,
  ngZoneImport: ts.ImportSpecifier,
): ts.Node[] {
  const unsupportedUsages: ts.Node[] = [];
  const ngZoneClassName = ngZoneImport.name.text;

  const staticMethods = new Set([
    'isInAngularZone',
    'assertInAngularZone',
    'assertNotInAngularZone',
  ]);
  const instanceMethods = new Set(['onMicrotaskEmpty', 'onStable']);

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
