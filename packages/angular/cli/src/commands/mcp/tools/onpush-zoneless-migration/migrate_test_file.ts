/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import * as fs from 'node:fs';
import { glob } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { SourceFile } from 'typescript';
import { createFixResponseForZoneTests, createProvideZonelessForTestsSetupPrompt } from './prompts';
import { loadTypescript } from './ts_utils';
import { MigrationResponse } from './types';

export async function migrateTestFile(sourceFile: SourceFile): Promise<MigrationResponse | null> {
  const ts = await loadTypescript();
  // Check if tests use zoneless either by default through `initTestEnvironment` or by explicitly calling `provideZonelessChangeDetection`.
  let testsUseZonelessChangeDetection = await searchForGlobalZoneless(sourceFile.fileName);
  if (!testsUseZonelessChangeDetection) {
    ts.forEachChild(sourceFile, function visit(node) {
      if (
        ts.isCallExpression(node) &&
        node.expression.getText(sourceFile) === 'provideZonelessChangeDetection'
      ) {
        testsUseZonelessChangeDetection = true;

        return;
      }
      ts.forEachChild(node, visit);
    });
  }

  if (!testsUseZonelessChangeDetection) {
    // Tests do not use zoneless, so we provide instructions to set it up.
    return createProvideZonelessForTestsSetupPrompt(sourceFile.fileName);
  }

  // At this point, tests are using zoneless, so we look for any explicit uses of `provideZoneChangeDetection` that need to be fixed.
  return createFixResponseForZoneTests(sourceFile);
}

export async function searchForGlobalZoneless(startPath: string): Promise<boolean> {
  const angularJsonDir = findAngularJsonDir(startPath);
  if (!angularJsonDir) {
    // Cannot determine project root, fallback to original behavior or assume false.
    // For now, let's assume no global setup if angular.json is not found.
    return false;
  }

  try {
    const files = glob(`${angularJsonDir}/**/*.ts`);
    for await (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      if (
        content.includes('initTestEnvironment') &&
        content.includes('provideZonelessChangeDetection')
      ) {
        return true;
      }
    }
  } catch (e) {
    return false;
  }

  return false;
}

function findAngularJsonDir(startDir: string): string | null {
  let currentDir = startDir;
  while (true) {
    if (fs.existsSync(join(currentDir, 'angular.json'))) {
      return currentDir;
    }
    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) {
      return null;
    }
    currentDir = parentDir;
  }
}
