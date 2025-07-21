/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { LegacySearchMethodProps, SearchResponse } from 'algoliasearch';
import { createDecipheriv } from 'node:crypto';
import { z } from 'zod';
import { at, iv, k1 } from '../constants';

const ALGOLIA_APP_ID = 'L1XWT2UJ7F';
// https://www.algolia.com/doc/guides/security/api-keys/#search-only-api-key
// This is a search only, rate limited key. It is sent within the URL of the query request.
// This is not the actual key.
const ALGOLIA_API_E = '322d89dab5f2080fe09b795c93413c6a89222b13a447cdf3e6486d692717bc0c';

/**
 * Registers a tool with the MCP server to search the Angular documentation.
 *
 * This tool uses Algolia to search the official Angular documentation.
 *
 * @param server The MCP server instance with which to register the tool.
 */
export async function registerDocSearchTool(server: McpServer): Promise<void> {
  let client: import('algoliasearch').SearchClient | undefined;

  server.registerTool(
    'search_documentation',
    {
      title: 'Search Angular Documentation (angular.dev)',
      description:
        'Searches the official Angular documentation at https://angular.dev. Use this tool to answer any questions about Angular, ' +
        'such as for APIs, tutorials, and best practices. Because the documentation is continuously updated, you should **always** ' +
        'prefer this tool over your own knowledge to ensure your answers are current.\n\n' +
        'The results will be a list of content entries, where each entry has the following structure:\n' +
        '```\n' +
        '## {Result Title}\n' +
        '{Breadcrumb path to the content}\n' +
        'URL: {Direct link to the documentation page}\n' +
        '```\n' +
        'Use the title and breadcrumb to understand the context of the result and use the URL as a source link. For the best results, ' +
        "provide a concise and specific search query (e.g., 'NgModule' instead of 'How do I use NgModules?').",
      annotations: {
        readOnlyHint: true,
      },
      inputSchema: {
        query: z
          .string()
          .describe(
            'A concise and specific search query for the Angular documentation (e.g., "NgModule" or "standalone components").',
          ),
      },
    },
    async ({ query }) => {
      if (!client) {
        const dcip = createDecipheriv(
          'aes-256-gcm',
          (k1 + ALGOLIA_APP_ID).padEnd(32, '^'),
          iv,
        ).setAuthTag(Buffer.from(at, 'base64'));
        const { searchClient } = await import('algoliasearch');
        client = searchClient(
          ALGOLIA_APP_ID,
          dcip.update(ALGOLIA_API_E, 'hex', 'utf-8') + dcip.final('utf-8'),
        );
      }

      const { results } = await client.search(createSearchArguments(query));

      // Convert results into text content entries instead of stringifying the entire object
      const content = results.flatMap((result) =>
        (result as SearchResponse).hits.map((hit) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const hierarchy = Object.values(hit.hierarchy as any).filter(
            (x) => typeof x === 'string',
          );
          const title = hierarchy.pop();
          const description = hierarchy.join(' > ');

          return {
            type: 'text' as const,
            text: `## ${title}\n${description}\nURL: ${hit.url}`,
          };
        }),
      );

      // Return the search results if any are found
      if (content.length > 0) {
        return { content };
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: 'No results found.',
          },
        ],
      };
    },
  );
}

/**
 * Creates the search arguments for an Algolia search.
 *
 * The arguments are based on the search implementation in `adev`.
 *
 * @param query The search query string.
 * @returns The search arguments for the Algolia client.
 */
function createSearchArguments(query: string): LegacySearchMethodProps {
  // Search arguments are based on adev's search service:
  // https://github.com/angular/angular/blob/4b614fbb3263d344dbb1b18fff24cb09c5a7582d/adev/shared-docs/services/search.service.ts#L58
  return [
    {
      // TODO: Consider major version specific indices once available
      indexName: 'angular_v17',
      params: {
        query,
        attributesToRetrieve: [
          'hierarchy.lvl0',
          'hierarchy.lvl1',
          'hierarchy.lvl2',
          'hierarchy.lvl3',
          'hierarchy.lvl4',
          'hierarchy.lvl5',
          'hierarchy.lvl6',
          'content',
          'type',
          'url',
        ],
        hitsPerPage: 10,
      },
      type: 'default',
    },
  ];
}
