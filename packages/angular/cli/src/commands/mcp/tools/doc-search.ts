/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { LegacySearchMethodProps, SearchResponse } from 'algoliasearch';
import { createDecipheriv } from 'node:crypto';
import { Readable } from 'node:stream';
import { z } from 'zod';
import { at, iv, k1 } from '../constants';
import { type McpToolContext, declareTool } from './tool-registry';

const ALGOLIA_APP_ID = 'L1XWT2UJ7F';
// https://www.algolia.com/doc/guides/security/api-keys/#search-only-api-key
// This is a search only, rate limited key. It is sent within the URL of the query request.
// This is not the actual key.
const ALGOLIA_API_E = '34738e8ae1a45e58bbce7b0f9810633d8b727b44a6479cf5e14b6a337148bd50';

/**
 * The minimum major version of Angular for which a version-specific documentation index is known to exist.
 * Searches for versions older than this will be clamped to this version.
 */
const MIN_SUPPORTED_DOCS_VERSION = 17;

/**
 * The latest major version of Angular for which a documentation index is known to be stable and available.
 * This acts as a "safe harbor" fallback. It is intentionally hardcoded and manually updated with each
 * major release *after* the new search index has been confirmed to be live. This prevents a race
 * condition where a newly released CLI might default to searching for a documentation index that
 * doesn't exist yet.
 */
const LATEST_KNOWN_DOCS_VERSION = 20;

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
    .default(false)
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
* **Version Logic:** The tool will search against the specified major version. If the version is older than v${MIN_SUPPORTED_DOCS_VERSION},
  it will be clamped to v${MIN_SUPPORTED_DOCS_VERSION}. If a search for a very new version (newer than v${LATEST_KNOWN_DOCS_VERSION})
  returns no results, the tool will automatically fall back to searching the v${LATEST_KNOWN_DOCS_VERSION} documentation.
* **Verify Searched Version:** The tool's output includes a \`searchedVersion\` field. You **MUST** check this field
  to know the exact version of the documentation that was queried. Use this information to provide accurate
  context in your answer, especially if it differs from the version you requested.
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
    searchedVersion: z
      .number()
      .describe('The major version of the documentation that was searched.'),
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

    let finalSearchedVersion = Math.max(
      version ?? LATEST_KNOWN_DOCS_VERSION,
      MIN_SUPPORTED_DOCS_VERSION,
    );
    let searchResults;
    try {
      searchResults = await client.search(createSearchArguments(query, finalSearchedVersion));
    } catch {}

    // If the initial search for a newer-than-stable version returns no results, it may be because
    // the index for that version doesn't exist yet. In this case, fall back to the latest known
    // stable version.
    if (!searchResults && finalSearchedVersion > LATEST_KNOWN_DOCS_VERSION) {
      finalSearchedVersion = LATEST_KNOWN_DOCS_VERSION;
      searchResults = await client.search(createSearchArguments(query, finalSearchedVersion));
    }

    const allHits = searchResults?.results.flatMap((result) => (result as SearchResponse).hits);

    if (!allHits?.length) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `No results found for query "${query}" in Angular v${finalSearchedVersion} documentation.`,
          },
        ],
        structuredContent: { results: [], searchedVersion: finalSearchedVersion },
      };
    }

    const structuredResults = [];
    const textContent: {
      type: 'text';
      text: string;
      annotations?: { audience: Array<'user' | 'assistant'>; priority: number };
    }[] = [
      {
        type: 'text' as const,
        text: `Showing results for Angular v${finalSearchedVersion} documentation.`,
        annotations: {
          audience: ['assistant'],
          priority: 0.9,
        },
      },
    ];

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
          if (response.ok && response.body) {
            topContent = await extractMainContent(
              Readable.fromWeb(response.body, { encoding: 'utf-8' }),
            );
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
      structuredContent: { results: structuredResults, searchedVersion: finalSearchedVersion },
    };
  };
}

/**
 * Extracts the text content of the `<main>` element by streaming an HTML response.
 *
 * @param htmlStream A readable stream of the HTML content of a page.
 * @returns A promise that resolves to the text content of the `<main>` element, or `undefined` if not found.
 */
async function extractMainContent(htmlStream: Readable): Promise<string | undefined> {
  const { RewritingStream } = await import('parse5-html-rewriting-stream');

  const rewriter = new RewritingStream();
  let mainTextContent = '';
  let inMainElement = false;
  let mainTagFound = false;

  rewriter.on('startTag', (tag) => {
    if (tag.tagName === 'main') {
      inMainElement = true;
      mainTagFound = true;
    }
  });

  rewriter.on('endTag', (tag) => {
    if (tag.tagName === 'main') {
      inMainElement = false;
    }
  });

  // Only capture text content, and only when inside the <main> element.
  rewriter.on('text', (text) => {
    if (inMainElement) {
      mainTextContent += text.text;
    }
  });

  return new Promise((resolve, reject) => {
    htmlStream
      .pipe(rewriter)
      .on('finish', () => {
        if (!mainTagFound) {
          resolve(undefined);

          return;
        }

        resolve(mainTextContent.trim());
      })
      .on('error', reject);
  });
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
function createSearchArguments(query: string, version: number): LegacySearchMethodProps {
  // Search arguments are based on adev's search service:
  // https://github.com/angular/angular/blob/4b614fbb3263d344dbb1b18fff24cb09c5a7582d/adev/shared-docs/services/search.service.ts#L58
  return [
    {
      indexName: `angular_v${version}`,
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
