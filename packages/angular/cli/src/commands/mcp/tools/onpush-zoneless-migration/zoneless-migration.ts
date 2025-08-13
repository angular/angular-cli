/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol';
import { ServerNotification, ServerRequest } from '@modelcontextprotocol/sdk/types';
import * as fs from 'node:fs';
import { glob } from 'node:fs/promises';
import { type SourceFile } from 'typescript';
import { z } from 'zod';
import { declareTool } from '../tool-registry';
import { analyzeForUnsupportedZoneUses } from './analyze_for_unsupported_zone_uses';
import { migrateSingleFile } from './migrate_single_file';
import { migrateTestFile } from './migrate_test_file';
import { createTestDebuggingGuideForNonActionableInput } from './prompts';
import { sendDebugMessage } from './send_debug_message';
import { createSourceFile, getImportSpecifier } from './ts_utils';

export const ZONELESS_MIGRATION_TOOL = declareTool({
  name: 'onpush-zoneless-migration',
  title: 'Plan migration to OnPush and/or zoneless',
  description:
    '**Required tool for migrating Angular components to OnPush change detection or zoneless.**' +
    ' This tool orchestrates the entire migration process, including running prerequisite migrations' +
    ' for signal inputs and queries. Use this tool as the first step before making any manual changes' +
    ' to adopt `ChangeDetectionStrategy.OnPush` or `provideZonelessChangeDetection`.',
  isReadOnly: true,
  isLocalOnly: true,
  inputSchema: {
    fileOrDirPath: z
      .string()
      .describe(
        'The absolute path of the directory or file with the component(s), directive(s), or service(s) to migrate.' +
          ' The contents are read with fs.readFileSync.',
      ),
  },
  factory:
    () =>
    ({ fileOrDirPath }, requestHandlerExtra) =>
      registerZonelessMigrationTool(fileOrDirPath, requestHandlerExtra),
});
export async function registerZonelessMigrationTool(
  fileOrDirPath: string,
  extras: RequestHandlerExtra<ServerRequest, ServerNotification>,
) {
  let files: SourceFile[] = [];
  const componentTestFiles = new Set<SourceFile>();
  const filesWithComponents = new Set<SourceFile>();
  const zoneFiles = new Set<SourceFile>();

  if (fs.statSync(fileOrDirPath).isDirectory()) {
    const allFiles = glob(`${fileOrDirPath}/**/*.ts`);
    for await (const file of allFiles) {
      files.push(await createSourceFile(file));
    }
  } else {
    files = [await createSourceFile(fileOrDirPath)];
    const maybeTestFile = await getTestFilePath(fileOrDirPath);
    if (maybeTestFile) {
      componentTestFiles.add(await createSourceFile(maybeTestFile));
    }
  }

  for (const sourceFile of files) {
    const content = sourceFile.getFullText();
    const componentSpecifier = await getImportSpecifier(sourceFile, '@angular/core', 'Component');
    const zoneSpecifier = await getImportSpecifier(sourceFile, '@angular/core', 'NgZone');
    const testBedSpecifier = await getImportSpecifier(
      sourceFile,
      /(@angular\/core)?\/testing/,
      'TestBed',
    );
    if (testBedSpecifier) {
      componentTestFiles.add(sourceFile);
    } else if (componentSpecifier) {
      if (
        !content.includes('changeDetectionStrategy: ChangeDetectionStrategy.OnPush') &&
        !content.includes('changeDetectionStrategy: ChangeDetectionStrategy.Default')
      ) {
        filesWithComponents.add(sourceFile);
      } else {
        sendDebugMessage(
          `Component file already has change detection strategy: ${sourceFile.fileName}. Skipping migration.`,
          extras,
        );
      }

      const testFilePath = await getTestFilePath(sourceFile.fileName);
      if (testFilePath) {
        componentTestFiles.add(await createSourceFile(testFilePath));
      }
    } else if (zoneSpecifier) {
      zoneFiles.add(sourceFile);
    }
  }

  if (zoneFiles.size > 0) {
    for (const file of zoneFiles) {
      const result = await analyzeForUnsupportedZoneUses(file);
      if (result !== null) {
        return result;
      }
    }
  }

  if (filesWithComponents.size > 0) {
    const rankedFiles =
      filesWithComponents.size > 1
        ? await rankComponentFilesForMigration(extras, Array.from(filesWithComponents))
        : Array.from(filesWithComponents);

    for (const file of rankedFiles) {
      const result = await migrateSingleFile(file, extras);
      if (result !== null) {
        return result;
      }
    }
  }

  for (const file of componentTestFiles) {
    const result = await migrateTestFile(file);
    if (result !== null) {
      return result;
    }
  }

  return createTestDebuggingGuideForNonActionableInput(fileOrDirPath);
}

async function rankComponentFilesForMigration(
  { sendRequest }: RequestHandlerExtra<ServerRequest, ServerNotification>,
  componentFiles: SourceFile[],
): Promise<SourceFile[]> {
  try {
    const response = await sendRequest(
      {
        method: 'sampling/createMessage',
        params: {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text:
                  `The following files are components that need to be migrated to OnPush change detection.` +
                  ` Please rank them based on which ones are most likely to be shared or common components.` +
                  ` The most likely shared component should be first.
  ${componentFiles.map((f) => f.fileName).join('\n  ')}
  Respond ONLY with the ranked list of files, one file per line.`,
              },
            },
          ],
          systemPrompt:
            'You are a helpful assistant that helps migrate identify shared Angular components.',
          maxTokens: 2000,
        },
      },
      z.object({ sortedFiles: z.array(z.string()) }),
    );

    const rankedFiles = response.sortedFiles
      .map((line) => line.trim())
      .map((fileName) => componentFiles.find((f) => f.fileName === fileName))
      .filter((f) => !!f);

    // Ensure the ranking didn't mess up the list of files
    if (rankedFiles.length === componentFiles.length) {
      return rankedFiles;
    }
  } catch {}

  return componentFiles; // Fallback to original order if the response fails
}

async function getTestFilePath(filePath: string): Promise<string | undefined> {
  const testFilePath = filePath.replace(/\.ts$/, '.spec.ts');
  if (fs.existsSync(testFilePath)) {
    return testFilePath;
  }

  return undefined;
}
