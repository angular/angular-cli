/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { createRequestHandler } from '@angular/ssr';
import type { createNodeRequestHandler } from '@angular/ssr/node' with {
  'resolution-mode': 'import',
};

export function isSsrNodeRequestHandler(
  value: unknown,
): value is ReturnType<typeof createNodeRequestHandler> {
  return typeof value === 'function' && '__ng_node_request_handler__' in value;
}
export function isSsrRequestHandler(
  value: unknown,
): value is ReturnType<typeof createRequestHandler> {
  return typeof value === 'function' && '__ng_request_handler__' in value;
}

/**
 * A mapping of the characters which have to be escaped to be interpolated into HTML,
 * to their entity equivalents.
 */
const HTML_ESCAPE_CHARACTER_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * Escapes the characters of a value which is interpolated into HTML text or into a quoted
 * attribute value.
 *
 * @param text - The value to escape.
 * @returns The escaped value.
 */
function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (character) => HTML_ESCAPE_CHARACTER_MAP[character]);
}

/**
 * Generates a static HTML page with a meta refresh tag to redirect the user to a specified URL.
 *
 * This function creates a simple HTML page that performs a redirect using a meta tag.
 * It includes a fallback link in case the meta-refresh doesn't work.
 *
 * The provided URL is HTML-escaped before being interpolated.
 *
 * @param url - The URL to which the page should redirect.
 * @returns The HTML content of the static redirect page.
 */
export function generateRedirectStaticPage(url: string): string {
  const escapedUrl = escapeHtml(url);

  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Redirecting</title>
    <meta http-equiv="refresh" content="0; url=${escapedUrl}">
  </head>
  <body>
    <pre>Redirecting to <a href="${escapedUrl}">${escapedUrl}</a></pre>
  </body>
</html>
`.trim();
}
