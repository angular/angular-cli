/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Exception, SourceSpan, StringOptionsWithImporter, compileString } from 'sass';
import { fileURLToPath, pathToFileURL } from 'url';
import { MessagePort, parentPort, receiveMessageOnPort, workerData } from 'worker_threads';

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
  options: Omit<StringOptionsWithImporter<'sync'>, 'url'> & { url?: string };
  /**
   * Indicates the request has a custom importer function on the main thread.
   */
  hasImporter: boolean;
  /**
   * Indicates the request has a custom logger for warning messages.
   */
  hasLogger: boolean;
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

  const { id, hasImporter, hasLogger, source, options } = message;
  let warnings:
    | {
        message: string;
        deprecation: boolean;
        stack?: string;
        span?: Omit<SourceSpan, 'url'> & { url?: string };
      }[]
    | undefined;
  try {
    if (hasImporter) {
      // When a custom importer function is present, the importer request must be proxied
      // back to the main thread where it can be executed.
      // This process must be synchronous from the perspective of dart-sass. The `Atomics`
      // functions combined with the shared memory `importSignal` and the Node.js
      // `receiveMessageOnPort` function are used to ensure synchronous behavior.
      options.importers = [
        {
          findFileUrl: (url, options) => {
            Atomics.store(importerSignal, 0, 0);
            workerImporterPort.postMessage({ id, url, options });
            Atomics.wait(importerSignal, 0, 0);

            const result = receiveMessageOnPort(workerImporterPort)?.message as string | null;

            return result ? pathToFileURL(result) : null;
          },
        },
      ];
    }

    // The synchronous Sass render function can be up to two times faster than the async variant
    const result = compileString(source, {
      ...options,
      // URL is not serializable so to convert to string in the parent and back to URL here.
      url: options.url ? pathToFileURL(options.url) : undefined,
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
