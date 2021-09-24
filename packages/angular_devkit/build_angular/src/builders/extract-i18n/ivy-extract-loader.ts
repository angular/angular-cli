/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as nodePath from 'path';
import { loadEsmModule } from '../../utils/load-esm';

// Extract loader source map parameter type since it is not exported directly
type LoaderSourceMap = Parameters<import('webpack').LoaderDefinitionFunction>[1];

interface LocalizeExtractLoaderOptions {
  messageHandler: (messages: import('@angular/localize').ɵParsedMessage[]) => void;
}

export default function localizeExtractLoader(
  this: import('webpack').LoaderContext<LocalizeExtractLoaderOptions>,
  content: string,
  map: LoaderSourceMap,
) {
  const options = this.getOptions();
  const callback = this.async();

  extract(this, content, map, options).then(
    () => {
      // Pass through the original content now that messages have been extracted
      callback(undefined, content, map);
    },
    (error) => {
      callback(error);
    },
  );
}

async function extract(
  loaderContext: import('webpack').LoaderContext<LocalizeExtractLoaderOptions>,
  content: string,
  map: string | LoaderSourceMap | undefined,
  options: LocalizeExtractLoaderOptions,
) {
  // Try to load the `@angular/localize` message extractor.
  // All the localize usages are setup to first try the ESM entry point then fallback to the deep imports.
  // This provides interim compatibility while the framework is transitioned to bundled ESM packages.
  // TODO_ESM: Remove all deep imports once `@angular/localize` is published with the `tools` entry point
  let MessageExtractor;
  try {
    try {
      // Load ESM `@angular/localize/tools` using the TypeScript dynamic import workaround.
      // Once TypeScript provides support for keeping the dynamic import this workaround can be
      // changed to a direct dynamic import.
      const localizeToolsModule = await loadEsmModule<
        typeof import('@angular/localize/src/tools/src/extract/extraction')
      >('@angular/localize/tools');
      MessageExtractor = localizeToolsModule.MessageExtractor;
    } catch {
      MessageExtractor = (await import('@angular/localize/src/tools/src/extract/extraction'))
        .MessageExtractor;
    }
  } catch {
    throw new Error(
      `Unable to load message extractor. Please ensure '@angular/localize' is installed.`,
    );
  }

  // Setup a Webpack-based logger instance
  const logger = {
    // level 2 is warnings
    level: 2,
    debug(...args: string[]): void {
      // eslint-disable-next-line no-console
      console.debug(...args);
    },
    info(...args: string[]): void {
      loaderContext.emitWarning(new Error(args.join('')));
    },
    warn(...args: string[]): void {
      loaderContext.emitWarning(new Error(args.join('')));
    },
    error(...args: string[]): void {
      loaderContext.emitError(new Error(args.join('')));
    },
  };

  let filename = loaderContext.resourcePath;
  const mapObject =
    typeof map === 'string' ? (JSON.parse(map) as Exclude<LoaderSourceMap, string>) : map;
  if (mapObject?.file) {
    // The extractor's internal sourcemap handling expects the filenames to match
    filename = nodePath.join(loaderContext.context, mapObject.file);
  }

  // Setup a virtual file system instance for the extractor
  // * MessageExtractor itself uses readFile, relative and resolve
  // * Internal SourceFileLoader (sourcemap support) uses dirname, exists, readFile, and resolve
  const filesystem = {
    readFile(path: string): string {
      if (path === filename) {
        return content;
      } else if (path === filename + '.map') {
        return typeof map === 'string' ? map : JSON.stringify(map);
      } else {
        throw new Error('Unknown file requested: ' + path);
      }
    },
    relative(from: string, to: string): string {
      return nodePath.relative(from, to);
    },
    resolve(...paths: string[]): string {
      return nodePath.resolve(...paths);
    },
    exists(path: string): boolean {
      return path === filename || path === filename + '.map';
    },
    dirname(path: string): string {
      return nodePath.dirname(path);
    },
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const extractor = new MessageExtractor(filesystem as any, logger, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    basePath: loaderContext.rootContext as any,
    useSourceMaps: !!map,
  });

  const messages = extractor.extractMessages(filename);
  if (messages.length > 0) {
    options?.messageHandler(messages);
  }
}
