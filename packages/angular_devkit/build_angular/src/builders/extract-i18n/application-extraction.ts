/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import type { ɵParsedMessage as LocalizeMessage } from '@angular/localize';
import type { MessageExtractor } from '@angular/localize/tools';
import type { BuilderContext, BuilderOutput } from '@angular-devkit/architect';
import assert from 'node:assert';
import nodePath from 'node:path';
import { buildApplicationInternal } from '../application';
import type { ApplicationBuilderInternalOptions } from '../application/options';
import { buildEsbuildBrowser } from '../browser-esbuild';
import type { NormalizedExtractI18nOptions } from './options';

export async function extractMessages(
  options: NormalizedExtractI18nOptions,
  builderName: string,
  context: BuilderContext,
  extractorConstructor: typeof MessageExtractor,
): Promise<{
  builderResult: BuilderOutput;
  basePath: string;
  messages: LocalizeMessage[];
  useLegacyIds: boolean;
}> {
  const messages: LocalizeMessage[] = [];

  // Setup the build options for the application based on the buildTarget option
  const buildOptions = (await context.validateOptions(
    await context.getTargetOptions(options.buildTarget),
    builderName,
  )) as unknown as ApplicationBuilderInternalOptions;
  buildOptions.optimization = false;
  buildOptions.sourceMap = { scripts: true, vendor: true };
  buildOptions.localize = false;

  let build;
  if (builderName === '@angular-devkit/build-angular:application') {
    build = buildApplicationInternal;

    buildOptions.ssr = false;
    buildOptions.appShell = false;
    buildOptions.prerender = false;
  } else {
    build = buildEsbuildBrowser;
  }

  // Build the application with the build options
  let builderResult;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for await (const result of build(buildOptions as any, context, { write: false })) {
      builderResult = result;
      break;
    }

    assert(builderResult !== undefined, 'Application builder did not provide a result.');
  } catch (err) {
    builderResult = {
      success: false,
      error: (err as Error).message,
    };
  }

  // Extract messages from each output JavaScript file.
  // Output files are only present on a successful build.
  if (builderResult.outputFiles) {
    // Store the JS and JS map files for lookup during extraction
    const files = new Map<string, string>();
    for (const outputFile of builderResult.outputFiles) {
      if (outputFile.path.endsWith('.js')) {
        files.set(outputFile.path, outputFile.text);
      } else if (outputFile.path.endsWith('.js.map')) {
        files.set(outputFile.path, outputFile.text);
      }
    }

    // Setup the localize message extractor based on the in-memory files
    const extractor = setupLocalizeExtractor(extractorConstructor, files, context);

    // Attempt extraction of all output JS files
    for (const filePath of files.keys()) {
      if (!filePath.endsWith('.js')) {
        continue;
      }

      const fileMessages = extractor.extractMessages(filePath);
      messages.push(...fileMessages);
    }
  }

  return {
    builderResult,
    basePath: context.workspaceRoot,
    messages,
    // Legacy i18n identifiers are not supported with the new application builder
    useLegacyIds: false,
  };
}

function setupLocalizeExtractor(
  extractorConstructor: typeof MessageExtractor,
  files: Map<string, string>,
  context: BuilderContext,
): MessageExtractor {
  // Setup a virtual file system instance for the extractor
  // * MessageExtractor itself uses readFile, relative and resolve
  // * Internal SourceFileLoader (sourcemap support) uses dirname, exists, readFile, and resolve
  const filesystem = {
    readFile(path: string): string {
      // Output files are stored as relative to the workspace root
      const requestedPath = nodePath.relative(context.workspaceRoot, path);

      const content = files.get(requestedPath);
      if (content === undefined) {
        throw new Error('Unknown file requested: ' + requestedPath);
      }

      return content;
    },
    relative(from: string, to: string): string {
      return nodePath.relative(from, to);
    },
    resolve(...paths: string[]): string {
      return nodePath.resolve(...paths);
    },
    exists(path: string): boolean {
      // Output files are stored as relative to the workspace root
      const requestedPath = nodePath.relative(context.workspaceRoot, path);

      return files.has(requestedPath);
    },
    dirname(path: string): string {
      return nodePath.dirname(path);
    },
  };

  const logger = {
    // level 2 is warnings
    level: 2,
    debug(...args: string[]): void {
      // eslint-disable-next-line no-console
      console.debug(...args);
    },
    info(...args: string[]): void {
      context.logger.info(args.join(''));
    },
    warn(...args: string[]): void {
      context.logger.warn(args.join(''));
    },
    error(...args: string[]): void {
      context.logger.error(args.join(''));
    },
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const extractor = new extractorConstructor(filesystem as any, logger, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    basePath: context.workspaceRoot as any,
    useSourceMaps: true,
  });

  return extractor;
}
