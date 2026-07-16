/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { createMockContext } from '../testing/test-utils';
import { DOC_SEARCH_TOOL } from './doc-search';

describe('Doc Search Tool', () => {
  let mockContext: ReturnType<typeof createMockContext>['context'];
  let fetchSpy: jasmine.Spy;

  beforeEach(() => {
    const { context } = createMockContext();
    mockContext = context;

    fetchSpy = spyOn(globalThis, 'fetch');
  });

  it('should query the correct Algolia endpoint with headers and payload', async () => {
    fetchSpy.and.resolveTo(
      new Response(
        JSON.stringify({
          hits: [
            {
              hierarchy: {
                lvl0: 'Docs',
                lvl1: 'Standalone Components',
              },
              url: 'https://angular.dev/guide/standalone-components',
            },
          ],
        }),
        { status: 200, statusText: 'OK' },
      ),
    );

    const handler = DOC_SEARCH_TOOL.factory(mockContext);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (handler as any)({
      query: 'standalone',
      version: 22,
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [calledUrl, calledInit] = fetchSpy.calls.first().args;
    expect(calledUrl).toBe('https://L1XWT2UJ7F-dsn.algolia.net/1/indexes/angular_v22/query');
    expect(calledInit.method).toBe('POST');
    expect(calledInit.headers['X-Algolia-Application-Id']).toBe('L1XWT2UJ7F');
    expect(calledInit.headers['X-Algolia-API-Key']).toBeDefined();

    const body = JSON.parse(calledInit.body);
    expect(body.query).toBe('standalone');

    expect(result.structuredContent.searchedVersion).toBe(22);
    expect(result.structuredContent.results.length).toBe(1);
    expect(result.structuredContent.results[0].title).toBe('Standalone Components');
  });

  it('should fallback to latest known version if initial search returns no hits', async () => {
    // First call returns empty hits
    fetchSpy.and.returnValues(
      Promise.resolve(
        new Response(JSON.stringify({ hits: [] }), { status: 200, statusText: 'OK' }),
      ),
      // Second fallback call returns a hit
      Promise.resolve(
        new Response(
          JSON.stringify({
            hits: [
              {
                hierarchy: {
                  lvl0: 'Docs',
                  lvl1: 'Fallback Guide',
                },
                url: 'https://angular.dev/guide/fallback',
              },
            ],
          }),
          { status: 200, statusText: 'OK' },
        ),
      ),
    );

    const handler = DOC_SEARCH_TOOL.factory(mockContext);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (handler as any)({
      query: 'some-query',
      version: 24,
    });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fetchSpy.calls.first().args[0]).toBe(
      'https://L1XWT2UJ7F-dsn.algolia.net/1/indexes/angular_v24/query',
    );
    expect(fetchSpy.calls.mostRecent().args[0]).toBe(
      'https://L1XWT2UJ7F-dsn.algolia.net/1/indexes/angular_v22/query',
    );

    expect(result.structuredContent.searchedVersion).toBe(22);
    expect(result.structuredContent.results.length).toBe(1);
    expect(result.structuredContent.results[0].title).toBe('Fallback Guide');
  });
});
