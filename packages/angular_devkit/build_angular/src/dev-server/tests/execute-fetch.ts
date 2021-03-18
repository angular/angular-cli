/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import fetch, { RequestInit, Response } from 'node-fetch'; // tslint:disable-line:no-implicit-dependencies
import { mergeMap, take, timeout } from 'rxjs/operators';
import { URL } from 'url';
import {
  BuilderHarness,
  BuilderHarnessExecutionOptions,
  BuilderHarnessExecutionResult,
} from '../../testing/builder-harness';

export async function executeOnceAndFetch<T>(
  harness: BuilderHarness<T>,
  url: string,
  options?: Partial<BuilderHarnessExecutionOptions> & { request?: RequestInit },
): Promise<BuilderHarnessExecutionResult & { response?: Response }> {
  return harness
    .execute()
    .pipe(
      timeout(30000),
      mergeMap(async (executionResult) => {
        let response = undefined;
        if (executionResult.result?.success) {
          const resolvedUrl = new URL(url, `${executionResult.result.baseUrl}/`);
          response = await fetch(resolvedUrl, options?.request);
        }

        return { ...executionResult, response };
      }),
      take(1),
    )
    .toPromise();
}
