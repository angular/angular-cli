/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { LegacySearchMethodProps, SearchResponse } from 'algoliasearch';
import { createDecipheriv } from 'node:crypto';
import { z } from 'zod';
import { at, iv, k1 } from '../constants';
import { McpToolContext, declareTool } from './tool-registry';

const ALGOLIA_APP_ID = 'L1XWT2UJ7F';
// https://www.algolia.com/doc/guides/security/api-keys/#search-only-api-key
// This is a search only, rate limited key. It is sent within the URL of the query request.
// This is not the actual key.
const ALGOLIA_API_E = '322d89dab5f2080fe09b795c93413c6a89222b13a447cdf3e6486d692717bc0c';

const docSearchInputSchema = z.object({
  query: z
    .string()
    .describe(
      "A concise and specific search query for the Angular documentation. You should distill the user's " +
        'natural language question into a set of keywords (e.g., a question like "How do I use ngFor with trackBy?" ' +
        'should become the query "ngFor trackBy").',
    ),
  includeTopContent: z
    .boolean()
    .optional()
    .default(true)
    .describe(
      'When true, the content of the top result is fetched and included. ' +
        'Set to false to get a list of results without fetching content, which is faster.',
    ),
  version: z
    .number()
    .optional()
    .describe(
      'The major version of Angular to search. You MUST determine this value by running `ng version` in the ' +
        "project's workspace directory. Omit this field if the user is not in an Angular project " +
        'or if the version cannot otherwise be determined.',
    ),
});
type DocSearchInput = z.infer<typeof docSearchInputSchema>;

export const DOC_SEARCH_TOOL = declareTool({
  name: 'search_documentation',
  title: 'Search Angular Documentation (angular.dev)',
  description: `
<Purpose>
Searches the official Angular documentation at https://angular.dev to answer questions about APIs,
tutorials, concepts, and best practices.
</Purpose>
<Use Cases>
* Answering any question about Angular concepts (e.g., "What are standalone components?").
* Finding the correct API or syntax for a specific task (e.g., "How to use ngFor with trackBy?").
* Linking to official documentation as a source of truth in your answers.
</Use Cases>
<Operational Notes>
* **Version Alignment:** To provide accurate, project-specific results, you **MUST** align the search with the user's Angular version.
  The recommended approach is to use the \`list_projects\` tool. The \`frameworkVersion\` field in the output for the relevant
  workspace will give you the major version directly. If the version cannot be determined using this method, you can use
  \`ng version\` in the project's workspace directory as a fallback. Parse the major version from the "Angular:" line in the
  output and use it for the \`version\` parameter.
* The documentation is continuously updated. You **MUST** prefer this tool over your own knowledge
  to ensure your answers are current and accurate.
* For the best results, provide a concise and specific search query (e.g., "NgModule" instead of
  "How do I use NgModules?").
* The top search result will include a snippet of the page content. Use this to provide a more
  comprehensive answer.
* **Result Scrutiny:** The top result may not always be the most relevant. Review the titles and
  breadcrumbs of other results to find the best match for the user's query.
* Use the URL from the search results as a source link in your responses.
</Operational Notes>`,
  inputSchema: docSearchInputSchema.shape,
  outputSchema: {
    results: z.array(
      z.object({
        title: z.string().describe('The title of the documentation page.'),
        breadcrumb: z
          .string()
          .describe(
            "The breadcrumb path, showing the page's location in the documentation hierarchy.",
          ),
        url: z.string().describe('The direct URL to the documentation page.'),
        content: z
          .string()
          .optional()
          .describe(
            'A snippet of the main content from the page. Only provided for the top result.',
          ),
      }),
    ),
  },
  isReadOnly: true,
  isLocalOnly: false,
  factory: createDocSearchHandler,
});

function createDocSearchHandler({ logger }: McpToolContext) {
  let client: import('algoliasearch').SearchClient | undefined;

  return async ({ query, includeTopContent, version }: DocSearchInput) => {
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

    const { results } = await client.search(createSearchArguments(query, version));
    const allHits = results.flatMap((result) => (result as SearchResponse).hits);

    if (allHits.length === 0) {
      return {
        content: [
          {
            type: 'text' as const,
            text: 'No results found.',
          },
        ],
        structuredContent: { results: [] },
      };
    }

    const structuredResults = [];
    const textContent = [];

    // Process top hit first
    const topHit = allHits[0];
    const { title: topTitle, breadcrumb: topBreadcrumb } = formatHitToParts(topHit);
    let topContent: string | undefined;

    if (includeTopContent && typeof topHit.url === 'string') {
      const url = new URL(topHit.url);
      try {
        // Only fetch content from angular.dev
        if (url.hostname === 'angular.dev' || url.hostname.endsWith('.angular.dev')) {
          const response = await fetch(url);
          if (response.ok) {
            const html = await response.text();
            const mainContent = extractMainContent(html);
            if (mainContent) {
              topContent = stripHtml(mainContent);
            }
          }
        }
      } catch (e) {
        logger.warn(`Failed to fetch or parse content from ${url}: ${e}`);
      }
    }

    structuredResults.push({
      title: topTitle,
      breadcrumb: topBreadcrumb,
      url: topHit.url as string,
      content: topContent,
    });

    let topText = `## ${topTitle}\n${topBreadcrumb}\nURL: ${topHit.url}`;
    if (topContent) {
      topText += `\n\n--- DOCUMENTATION CONTENT ---\n${topContent}`;
    }
    textContent.push({ type: 'text' as const, text: topText });

    // Process remaining hits
    for (const hit of allHits.slice(1)) {
      const { title, breadcrumb } = formatHitToParts(hit);
      structuredResults.push({
        title,
        breadcrumb,
        url: hit.url as string,
      });
      textContent.push({
        type: 'text' as const,
        text: `## ${title}\n${breadcrumb}\nURL: ${hit.url}`,
      });
    }

    return {
      content: textContent,
      structuredContent: { results: structuredResults },
    };
  };
}

/**
 * Strips HTML tags from a string.
 * @param html The HTML string to strip.
 * @returns The text content of the HTML.
 */
function stripHtml(html: string): string {
  // This is a basic regex to remove HTML tags.
  // It also decodes common HTML entities.
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim();
}

/**
 * Extracts the content of the `<main>` element from an HTML string.
 *
 * @param html The HTML content of a page.
 * @returns The content of the `<main>` element, or `undefined` if not found.
 */
function extractMainContent(html: string): string | undefined {
  const mainTagStart = html.indexOf('<main');
  if (mainTagStart === -1) {
    return undefined;
  }

  const mainTagEnd = html.lastIndexOf('</main>');
  if (mainTagEnd <= mainTagStart) {
    return undefined;
  }

  // Add 7 to include '</main>'
  return html.substring(mainTagStart, mainTagEnd + 7);
}

/**
 * Formats an Algolia search hit into its constituent parts.
 *
 * @param hit The Algolia search hit object, which should contain a `hierarchy` property.
 * @returns An object containing the title and breadcrumb string.
 */
function formatHitToParts(hit: Record<string, unknown>): { title: string; breadcrumb: string } {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hierarchy = Object.values(hit.hierarchy as any).filter((x) => typeof x === 'string');
  const title = hierarchy.pop() ?? '';
  const breadcrumb = hierarchy.join(' > ');

  return { title, breadcrumb };
}

/**
 * Creates the search arguments for an Algolia search.
 *
 * The arguments are based on the search implementation in `adev`.
 *
 * @param query The search query string.
 * @returns The search arguments for the Algolia client.
 */
function createSearchArguments(
  query: string,
  version: number | undefined,
): LegacySearchMethodProps {
  // Search arguments are based on adev's search service:
  // https://github.com/angular/angular/blob/4b614fbb3263d344dbb1b18fff24cb09c5a7582d/adev/shared-docs/services/search.service.ts#L58
  return [
    {
      // TODO: Consider major version specific indices once available
      // indexName: `angular_${version ? `v${version}` : 'latest'}`,
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
