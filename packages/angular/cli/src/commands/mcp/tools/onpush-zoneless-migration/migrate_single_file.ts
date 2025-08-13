/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol';
import { ServerNotification, ServerRequest } from '@modelcontextprotocol/sdk/types';
import type { SourceFile } from 'typescript';
import { analyzeForUnsupportedZoneUses } from './analyze_for_unsupported_zone_uses';
import { migrateTestFile } from './migrate_test_file';
import { generateZonelessMigrationInstructionsForComponent } from './prompts';
import { sendDebugMessage } from './send_debug_message';
import { getImportSpecifier, loadTypescript } from './ts_utils';
import { MigrationResponse } from './types';

export async function migrateSingleFile(
  sourceFile: SourceFile,
  extras: RequestHandlerExtra<ServerRequest, ServerNotification>,
): Promise<MigrationResponse | null> {
  const testBedSpecifier = await getImportSpecifier(sourceFile, '@angular/core/testing', 'TestBed');
  const isTestFile = sourceFile.fileName.endsWith('.spec.ts') || !!testBedSpecifier;
  if (isTestFile) {
    return migrateTestFile(sourceFile);
  }

  const unsupportedZoneUseResponse = await analyzeForUnsupportedZoneUses(sourceFile);
  if (unsupportedZoneUseResponse) {
    return unsupportedZoneUseResponse;
  }

  let detectedStrategy: 'OnPush' | 'Default' | undefined;
  let hasComponentDecorator = false;

  const componentSpecifier = await getImportSpecifier(sourceFile, '@angular/core', 'Component');
  if (!componentSpecifier) {
    sendDebugMessage(`No component decorator found in file: ${sourceFile.fileName}`, extras);

    return null;
  }

  const ts = await loadTypescript();
  ts.forEachChild(sourceFile, function visit(node) {
    if (detectedStrategy) {
      return; // Already found, no need to traverse further
    }

    if (ts.isDecorator(node) && ts.isCallExpression(node.expression)) {
      const callExpr = node.expression;
      if (callExpr.expression.getText(sourceFile) === 'Component') {
        hasComponentDecorator = true;
        if (callExpr.arguments.length > 0 && ts.isObjectLiteralExpression(callExpr.arguments[0])) {
          const componentMetadata = callExpr.arguments[0];
          for (const prop of componentMetadata.properties) {
            if (
              ts.isPropertyAssignment(prop) &&
              prop.name.getText(sourceFile) === 'changeDetection'
            ) {
              if (
                ts.isPropertyAccessExpression(prop.initializer) &&
                prop.initializer.expression.getText(sourceFile) === 'ChangeDetectionStrategy'
              ) {
                const strategy = prop.initializer.name.text;
                if (strategy === 'OnPush' || strategy === 'Default') {
                  detectedStrategy = strategy;

                  return;
                }
              }
            }
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  });

  if (
    !hasComponentDecorator ||
    // component uses OnPush. We don't have anything more to do here.
    detectedStrategy === 'OnPush' ||
    // Explicit default strategy, assume there's a reason for it (already migrated, or is a library that hosts Default components) and skip.
    detectedStrategy === 'Default'
  ) {
    sendDebugMessage(
      `Component decorator found with strategy: ${detectedStrategy} in file: ${sourceFile.fileName}. Skipping migration for file.`,
      extras,
    );

    return null;
  }

  // Component decorator found, but no change detection strategy.
  return generateZonelessMigrationInstructionsForComponent(sourceFile.fileName);
}
