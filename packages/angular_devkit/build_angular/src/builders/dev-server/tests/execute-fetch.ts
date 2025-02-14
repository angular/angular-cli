/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { lastValueFrom, mergeMap, take, timeout } from 'rxjs';
import { URL } from 'node:url';
import {
  BuilderHarness,
  BuilderHarnessExecutionOptions,
  BuilderHarnessExecutionResult,
} from '../../../testing';

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
