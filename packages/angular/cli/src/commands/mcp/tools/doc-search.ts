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
        includeTopContent: z
          .boolean()
          .optional()
          .default(true)
          .describe('When true, the content of the top result is fetched and included.'),
      },
    },
    async ({ query, includeTopContent }) => {
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

      const allHits = results.flatMap((result) => (result as SearchResponse).hits);

      if (allHits.length === 0) {
        return {
          content: [
            {
              type: 'text' as const,
              text: 'No results found.',
            },
          ],
        };
      }

      const content = [];
      // The first hit is the top search result
      const topHit = allHits[0];

      // Process top hit first
      let topText = formatHitToText(topHit);

      try {
        if (includeTopContent && typeof topHit.url === 'string') {
          const url = new URL(topHit.url);

          // Only fetch content from angular.dev
          if (url.hostname === 'angular.dev' || url.hostname.endsWith('.angular.dev')) {
            const response = await fetch(url);
            if (response.ok) {
              const html = await response.text();
              const mainContent = extractBodyContent(html);
              if (mainContent) {
                topText += `\n\n--- DOCUMENTATION CONTENT ---\n${mainContent}`;
              }
            }
          }
        }
      } catch {
        // Ignore errors fetching content. The basic info is still returned.
      }
      content.push({
        type: 'text' as const,
        text: topText,
      });

      // Process remaining hits
      for (const hit of allHits.slice(1)) {
        content.push({
          type: 'text' as const,
          text: formatHitToText(hit),
        });
      }

      return { content };
    },
  );
}

/**
 * Extracts the content of the `<body>` element from an HTML string.
 *
 * @param html The HTML content of a page.
 * @returns The content of the `<body>` element, or `undefined` if not found.
 */
function extractBodyContent(html: string): string | undefined {
  // TODO: Use '<main>' element instead of '<body>' when available in angular.dev HTML.
  const mainTagStart = html.indexOf('<body');
  if (mainTagStart === -1) {
    return undefined;
  }

  const mainTagEnd = html.lastIndexOf('</body>');
  if (mainTagEnd <= mainTagStart) {
    return undefined;
  }

  // Add 7 to include '</body>'
  return html.substring(mainTagStart, mainTagEnd + 7);
}

/**
 * Formats an Algolia search hit into a text representation.
 *
 * @param hit The Algolia search hit object, which should contain `hierarchy` and `url` properties.
 * @returns A formatted string with title, description, and URL.
 */
function formatHitToText(hit: Record<string, unknown>): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hierarchy = Object.values(hit.hierarchy as any).filter((x) => typeof x === 'string');
  const title = hierarchy.pop();
  const description = hierarchy.join(' > ');

  return `## ${title}\n${description}\nURL: ${hit.url}`;
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
