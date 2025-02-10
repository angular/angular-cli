/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { IncomingMessage, RequestOptions, get } from 'node:http';
import { text } from 'node:stream/consumers';
import { lastValueFrom, mergeMap, take, timeout } from 'rxjs';
import {
  BuilderHarness,
  BuilderHarnessExecutionOptions,
  BuilderHarnessExecutionResult,
} from '../../../testing/builder-harness';

export async function executeOnceAndFetch<T>(
  harness: BuilderHarness<T>,
  url: string,
  options?: Partial<BuilderHarnessExecutionOptions> & { request?: RequestInit },
): Promise<BuilderHarnessExecutionResult & { response?: Response; content?: string }> {
  return lastValueFrom(
    harness.execute().pipe(
      timeout(30000),
      mergeMap(async (executionResult) => {
        let response = undefined;
        let content = undefined;
        if (executionResult.result?.success) {
          let baseUrl = `${executionResult.result.baseUrl}`;
          baseUrl = baseUrl[baseUrl.length - 1] === '/' ? baseUrl : `${baseUrl}/`;
          const resolvedUrl = new URL(url, baseUrl);
          const originalResponse = await fetch(resolvedUrl, options?.request);
          response = originalResponse.clone();
          // Ensure all data is available before stopping server
          content = await originalResponse.text();
        }

        return { ...executionResult, response, content };
      }),
      take(1),
    ),
  );
}

/**
 * Executes the builder and then immediately performs a GET request
 * via the Node.js `http` builtin module. This is useful for cases
 * where the `fetch` API is limited such as testing different `Host`
 * header values with the development server.
 * The `fetch` based alternative is preferred otherwise.
 *
 * @param harness A builder harness instance.
 * @param url The URL string to get.
 * @param options An options object.
 */
export async function executeOnceAndGet<T>(
  harness: BuilderHarness<T>,
  url: string,
  options?: Partial<BuilderHarnessExecutionOptions> & { request?: RequestOptions },
): Promise<BuilderHarnessExecutionResult & { response?: IncomingMessage; content?: string }> {
  return lastValueFrom(
    harness.execute().pipe(
      timeout(30_000),
      mergeMap(async (executionResult) => {
        let response = undefined;
        let content = undefined;
        if (executionResult.result?.success) {
          let baseUrl = `${executionResult.result.baseUrl}`;
          baseUrl = baseUrl[baseUrl.length - 1] === '/' ? baseUrl : `${baseUrl}/`;
          const resolvedUrl = new URL(url, baseUrl);

          response = await new Promise<IncomingMessage>((resolve) =>
            get(resolvedUrl, options?.request ?? {}, resolve),
          );

          if (response.statusCode === 200) {
            content = await text(response);
          }

          response.resume();
        }

        return { ...executionResult, response, content };
      }),
      take(1),
    ),
  );
}
