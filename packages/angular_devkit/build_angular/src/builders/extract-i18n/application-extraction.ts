/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { ApplicationBuilderOptions } from '@angular/build';
import { ResultFile, ResultKind, buildApplicationInternal } from '@angular/build/private';
import type { ɵParsedMessage as LocalizeMessage } from '@angular/localize';
import type { MessageExtractor } from '@angular/localize/tools';
import type { BuilderContext } from '@angular-devkit/architect';
import { readFileSync } from 'node:fs';
import nodePath from 'node:path';
import { BrowserBuilderOptions, convertBrowserOptions } from '../browser-esbuild';
import type { NormalizedExtractI18nOptions } from './options';

export async function extractMessages(
  options: NormalizedExtractI18nOptions,
  builderName: string,
  context: BuilderContext,
  extractorConstructor: typeof MessageExtractor,
): Promise<{
  success: boolean;
  basePath: string;
  messages: LocalizeMessage[];
  useLegacyIds: boolean;
}> {
  const messages: LocalizeMessage[] = [];

  // Setup the build options for the application based on the buildTarget option
  let buildOptions;
  if (builderName === '@angular-devkit/build-angular:application') {
    buildOptions = (await context.validateOptions(
      await context.getTargetOptions(options.buildTarget),
      builderName,
    )) as unknown as ApplicationBuilderOptions;
  } else {
    buildOptions = convertBrowserOptions(
      (await context.validateOptions(
        await context.getTargetOptions(options.buildTarget),
        builderName,
      )) as unknown as BrowserBuilderOptions,
    );
  }

  buildOptions.optimization = false;
  buildOptions.sourceMap = { scripts: true, vendor: true, styles: false };
  buildOptions.localize = false;
  buildOptions.budgets = undefined;
  buildOptions.index = false;
  buildOptions.serviceWorker = false;
  buildOptions.server = undefined;
  buildOptions.ssr = false;
  buildOptions.appShell = undefined;
  buildOptions.prerender = undefined;
  buildOptions.outputMode = undefined;

  const builderResult = await first(buildApplicationInternal(buildOptions, context));

  let success = false;
  if (!builderResult || builderResult.kind === ResultKind.Failure) {
    context.logger.error('Application build failed.');
  } else if (builderResult.kind !== ResultKind.Full) {
    context.logger.error('Application build did not provide a full output.');
  } else {
    // Setup the localize message extractor based on the in-memory files
    const extractor = setupLocalizeExtractor(extractorConstructor, builderResult.files, context);

    // Extract messages from each output JavaScript file.
    // Output files are only present on a successful build.
    for (const filePath of Object.keys(builderResult.files)) {
      if (!filePath.endsWith('.js')) {
        continue;
      }

      const fileMessages = extractor.extractMessages(filePath);
      messages.push(...fileMessages);
    }

    success = true;
  }

  return {
    success,
    basePath: context.workspaceRoot,
    messages,
    // Legacy i18n identifiers are not supported with the new application builder
    useLegacyIds: false,
  };
}

function setupLocalizeExtractor(
  extractorConstructor: typeof MessageExtractor,
  files: Record<string, ResultFile>,
  context: BuilderContext,
): MessageExtractor {
  const textDecoder = new TextDecoder();
  // Setup a virtual file system instance for the extractor
  // * MessageExtractor itself uses readFile, relative and resolve
  // * Internal SourceFileLoader (sourcemap support) uses dirname, exists, readFile, and resolve
  const filesystem = {
    readFile(path: string): string {
      // Output files are stored as relative to the workspace root
      const requestedPath = nodePath.relative(context.workspaceRoot, path);

      const file = files[requestedPath];
      let content;
      if (file?.origin === 'memory') {
        content = textDecoder.decode(file.contents);
      } else if (file?.origin === 'disk') {
        content = readFileSync(file.inputPath, 'utf-8');
      }
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

      return files[requestedPath] !== undefined;
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

async function first<T>(iterable: AsyncIterable<T>): Promise<T | undefined> {
  for await (const value of iterable) {
    return value;
  }
}
