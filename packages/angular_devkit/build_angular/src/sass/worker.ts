/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import mergeSourceMaps, { RawSourceMap } from '@ampproject/remapping';
import { Dirent } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { MessagePort, parentPort, receiveMessageOnPort, workerData } from 'node:worker_threads';
import {
  Exception,
  FileImporter,
  SourceSpan,
  StringOptionsWithImporter,
  compileString,
} from 'sass';
import {
  LoadPathsUrlRebasingImporter,
  ModuleUrlRebasingImporter,
  RelativeUrlRebasingImporter,
  sassBindWorkaround,
} from './rebasing-importer';

/**
 * A request to render a Sass stylesheet using the supplied options.
 */
interface RenderRequestMessage {
  /**
   * The unique request identifier that links the render action with a callback and optional
   * importer on the main thread.
   */
  id: number;
  /**
   * The contents to compile.
   */
  source: string;
  /**
   * The Sass options to provide to the `dart-sass` compile function.
   */
  options: Omit<StringOptionsWithImporter<'sync'>, 'url'> & { url: string };
  /**
   * Indicates the request has a custom importer function on the main thread.
   */
  hasImporter: boolean;
  /**
   * Indicates the request has a custom logger for warning messages.
   */
  hasLogger: boolean;
  /**
   * Indicates paths within url() CSS functions should be rebased.
   */
  rebase: boolean;
}

if (!parentPort || !workerData) {
  throw new Error('Sass worker must be executed as a Worker.');
}

// The importer variables are used to proxy import requests to the main thread
const { workerImporterPort, importerSignal } = workerData as {
  workerImporterPort: MessagePort;
  importerSignal: Int32Array;
};

parentPort.on('message', (message: RenderRequestMessage) => {
  if (!parentPort) {
    throw new Error('"parentPort" is not defined. Sass worker must be executed as a Worker.');
  }

  const { id, hasImporter, hasLogger, source, options, rebase } = message;
  const entryDirectory = dirname(options.url);
  let warnings:
    | {
        message: string;
        deprecation: boolean;
        stack?: string;
        span?: Omit<SourceSpan, 'url'> & { url?: string };
      }[]
    | undefined;
  try {
    const directoryCache = new Map<string, Dirent[]>();
    const rebaseSourceMaps = options.sourceMap ? new Map<string, RawSourceMap>() : undefined;
    if (hasImporter) {
      // When a custom importer function is present, the importer request must be proxied
      // back to the main thread where it can be executed.
      // This process must be synchronous from the perspective of dart-sass. The `Atomics`
      // functions combined with the shared memory `importSignal` and the Node.js
      // `receiveMessageOnPort` function are used to ensure synchronous behavior.
      const proxyImporter: FileImporter<'sync'> = {
        findFileUrl: (url, options) => {
          Atomics.store(importerSignal, 0, 0);
          workerImporterPort.postMessage({ id, url, options });
          Atomics.wait(importerSignal, 0, 0);

          const result = receiveMessageOnPort(workerImporterPort)?.message as string | null;

          return result ? pathToFileURL(result) : null;
        },
      };
      options.importers = [
        rebase
          ? sassBindWorkaround(
              new ModuleUrlRebasingImporter(
                entryDirectory,
                directoryCache,
                rebaseSourceMaps,
                proxyImporter.findFileUrl,
              ),
            )
          : proxyImporter,
      ];
    }

    if (rebase && options.loadPaths?.length) {
      options.importers ??= [];
      options.importers.push(
        sassBindWorkaround(
          new LoadPathsUrlRebasingImporter(
            entryDirectory,
            directoryCache,
            rebaseSourceMaps,
            options.loadPaths,
          ),
        ),
      );
      options.loadPaths = undefined;
    }

    let relativeImporter;
    if (rebase) {
      relativeImporter = sassBindWorkaround(
        new RelativeUrlRebasingImporter(entryDirectory, directoryCache, rebaseSourceMaps),
      );
    }

    // The synchronous Sass render function can be up to two times faster than the async variant
    const result = compileString(source, {
      ...options,
      // URL is not serializable so to convert to string in the parent and back to URL here.
      url: pathToFileURL(options.url),
      // The `importer` option (singular) handles relative imports
      importer: relativeImporter,
      logger: hasLogger
        ? {
            warn(message, { deprecation, span, stack }) {
              warnings ??= [];
              warnings.push({
                message,
                deprecation,
                stack,
                span: span && convertSourceSpan(span),
              });
            },
          }
        : undefined,
    });

    if (result.sourceMap && rebaseSourceMaps?.size) {
      // Merge the intermediate rebasing source maps into the final Sass generated source map.
      // Casting is required due to small but compatible differences in typings between the packages.
      result.sourceMap = mergeSourceMaps(
        result.sourceMap as unknown as RawSourceMap,
        // To prevent an infinite lookup loop, skip getting the source when the rebasing source map
        // is referencing its original self.
        (file, context) => (file !== context.importer ? rebaseSourceMaps.get(file) : null),
      ) as unknown as typeof result.sourceMap;
    }

    parentPort.postMessage({
      id,
      warnings,
      result: {
        ...result,
        // URL is not serializable so to convert to string here and back to URL in the parent.
        loadedUrls: result.loadedUrls.map((p) => fileURLToPath(p)),
      },
    });
  } catch (error) {
    // Needed because V8 will only serialize the message and stack properties of an Error instance.
    if (error instanceof Exception) {
      const { span, message, stack, sassMessage, sassStack } = error;
      parentPort.postMessage({
        id,
        warnings,
        error: {
          span: convertSourceSpan(span),
          message,
          stack,
          sassMessage,
          sassStack,
        },
      });
    } else if (error instanceof Error) {
      const { message, stack } = error;
      parentPort.postMessage({ id, warnings, error: { message, stack } });
    } else {
      parentPort.postMessage({
        id,
        warnings,
        error: { message: 'An unknown error has occurred.' },
      });
    }
  }
});

/**
 * Converts a Sass SourceSpan object into a serializable form.
 * The SourceSpan object contains a URL property which must be converted into a string.
 * Also, most of the interface's properties are get accessors and are not automatically
 * serialized when sent back from the worker.
 *
 * @param span The Sass SourceSpan object to convert.
 * @returns A serializable form of the SourceSpan object.
 */
function convertSourceSpan(span: SourceSpan): Omit<SourceSpan, 'url'> & { url?: string } {
  return {
    text: span.text,
    context: span.context,
    end: {
      column: span.end.column,
      offset: span.end.offset,
      line: span.end.line,
    },
    start: {
      column: span.start.column,
      offset: span.start.offset,
      line: span.start.line,
    },
    url: span.url ? fileURLToPath(span.url) : undefined,
  };
}
