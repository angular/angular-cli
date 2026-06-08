/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import mergeSourceMaps, { RawSourceMap } from '@ampproject/remapping';
import { dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { MessagePort, receiveMessageOnPort } from 'node:worker_threads';
import {
  Deprecation,
  Exception,
  FileImporter,
  SourceSpan,
  StringOptions,
  compileString,
} from 'sass';
import {
  DirectoryEntry,
  LoadPathsUrlRebasingImporter,
  ModuleUrlRebasingImporter,
  RelativeUrlRebasingImporter,
  sassBindWorkaround,
} from './rebasing-importer';
import type { SerializableDeprecation, SerializableWarningMessage } from './sass-service';

/**
 * A request to render a Sass stylesheet using the supplied options.
 */
interface RenderRequestMessage {
  /**
   * The contents to compile.
   */
  source: string;

  /**
   * The Sass options to provide to the `dart-sass` compile function.
   */
  options: Omit<StringOptions<'sync'>, 'url'> & { url: string };

  /**
   * Indicates the request has a custom importer function on the main thread.
   */
  importerChannel?: {
    port: MessagePort;
    signal: Int32Array;
  };

  /**
   * Indicates the request has a custom logger for warning messages.
   */
  hasLogger: boolean;

  /**
   * Indicates paths within url() CSS functions should be rebased.
   */
  rebase: boolean;
}

interface RenderResult {
  warnings: SerializableWarningMessage[] | undefined;
  result: {
    css: string;
    loadedUrls: string[];
    sourceMap?: RawSourceMap;
  };
}

interface RenderError {
  warnings: SerializableWarningMessage[] | undefined;
  error: {
    message: string;
    stack?: string;
    span?: Omit<SourceSpan, 'url'> & { url?: string };
    sassMessage?: string;
    sassStack?: string;
  };
}

export default async function renderSassStylesheet(
  request: RenderRequestMessage,
): Promise<RenderResult | RenderError> {
  const { importerChannel, hasLogger, source, options, rebase } = request;

  const entryDirectory = dirname(options.url);
  let warnings: SerializableWarningMessage[] | undefined;
  try {
    const directoryCache = new Map<string, DirectoryEntry>();
    const rebaseSourceMaps = options.sourceMap ? new Map<string, RawSourceMap>() : undefined;
    if (importerChannel) {
      // When a custom importer function is present, the importer request must be proxied
      // back to the main thread where it can be executed.
      // This process must be synchronous from the perspective of dart-sass. The `Atomics`
      // functions combined with the shared memory `importSignal` and the Node.js
      // `receiveMessageOnPort` function are used to ensure synchronous behavior.
      const proxyImporter: FileImporter<'sync'> = {
        findFileUrl: (url, { fromImport, containingUrl }) => {
          Atomics.store(importerChannel.signal, 0, 0);
          importerChannel.port.postMessage({
            url,
            options: {
              fromImport,
              containingUrl: containingUrl ? fileURLToPath(containingUrl) : null,
            },
          });
          // Wait for the main thread to set the signal to 1 and notify, which tells
          // us that a message can be received on the port.
          // If the main thread is fast, the signal will already be set to 1, and no
          // sleep/notify is necessary.
          // However, there can be a race condition here:
          // - the main thread sets the signal to 1, but does not get to the notify instruction yet
          // - the worker does not pause because the signal is set to 1
          // - the worker very soon enters this method again
          // - this method sets the signal to 0 and sends the message
          // - the signal is 0 and so the `Atomics.wait` call blocks
          // - only now the main thread runs the `notify` from the first invocation, so the
          //   worker continues.
          // - but there is no message yet in the port, because the thread should not have been
          //   waken up yet.
          // To combat this, wait for a non-0 value _twice_.
          // Almost every time, this immediately continues with "not-equal", because
          // the signal is still set to 1, except during the race condition, when the second
          // wait will wait for the correct notify.
          Atomics.wait(importerChannel.signal, 0, 0);
          Atomics.wait(importerChannel.signal, 0, 0);

          const result = receiveMessageOnPort(importerChannel.port)?.message as string | null;

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
            warn(message, warnOptions) {
              warnings ??= [];
              warnings.push({
                ...warnOptions,
                message,
                span: warnOptions.span && convertSourceSpan(warnOptions.span),
                ...convertDeprecation(
                  warnOptions.deprecation,
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (warnOptions as any).deprecationType,
                ),
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

    return {
      warnings,
      result: {
        ...result,
        sourceMap: result.sourceMap as unknown as RawSourceMap | undefined,
        // URL is not serializable so to convert to string here and back to URL in the parent.
        loadedUrls: result.loadedUrls.map((p) => fileURLToPath(p)),
      },
    };
  } catch (error) {
    // Needed because V8 will only serialize the message and stack properties of an Error instance.
    if (error instanceof Exception) {
      const { span, message, stack, sassMessage, sassStack } = error;

      return {
        warnings,
        error: {
          span: convertSourceSpan(span),
          message,
          stack,
          sassMessage,
          sassStack,
        },
      };
    } else if (error instanceof Error) {
      const { message, stack } = error;

      return { warnings, error: { message, stack } };
    } else {
      return {
        warnings,
        error: { message: 'An unknown error has occurred.' },
      };
    }
  }
}

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

function convertDeprecation(
  deprecation: boolean,
  deprecationType: Deprecation | undefined,
): { deprecation: false } | { deprecation: true; deprecationType: SerializableDeprecation } {
  if (!deprecation || !deprecationType) {
    return { deprecation: false };
  }

  const { obsoleteIn, deprecatedIn, ...rest } = deprecationType;

  return {
    deprecation: true,
    deprecationType: {
      ...rest,
      obsoleteIn: obsoleteIn
        ? {
            major: obsoleteIn.major,
            minor: obsoleteIn.minor,
            patch: obsoleteIn.patch,
          }
        : null,
      deprecatedIn: deprecatedIn
        ? {
            major: deprecatedIn.major,
            minor: deprecatedIn.minor,
            patch: deprecatedIn.patch,
          }
        : null,
    },
  };
}
