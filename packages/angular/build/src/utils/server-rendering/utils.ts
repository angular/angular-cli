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

const htmlEscapeCharacters: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (character) => htmlEscapeCharacters[character]);
}

const unsafeStaticRedirectCharacters = /[\\<>"'`]/;
const allowedStaticRedirectProtocols = new Set(['http:', 'https:']);

function hasUnsafeStaticRedirectCharacters(value: string): boolean {
  for (let index = 0; index < value.length; index++) {
    const characterCode = value.charCodeAt(index);
    if (characterCode <= 0x20 || characterCode === 0x7f) {
      return true;
    }
  }

  return unsafeStaticRedirectCharacters.test(value);
}

export function validateStaticRedirectUrl(url: string): string | undefined {
  if (hasUnsafeStaticRedirectCharacters(url)) {
    return (
      `the value '${url}' contains characters that are not allowed in a statically ` +
      `emitted URL (control characters, whitespace, backslash, or HTML-significant characters).`
    );
  }

  if (url.startsWith('/')) {
    return url.startsWith('//')
      ? 'protocol-relative URLs are not supported for statically emitted redirects. ' +
          'Only HTTP(S) URLs and same-origin absolute paths are supported.'
      : undefined;
  }

  const schemeMatch = /^([a-zA-Z][a-zA-Z0-9+\-.]*):/.exec(url);
  if (!schemeMatch) {
    return (
      `the value '${url}' is not a valid absolute URL or same-origin absolute path. ` +
      `Only HTTP(S) URLs and same-origin absolute paths are supported.`
    );
  }

  const protocol = `${schemeMatch[1].toLowerCase()}:`;
  if (!allowedStaticRedirectProtocols.has(protocol)) {
    return (
      `the protocol '${protocol}' is not allowed for a statically emitted redirect. ` +
      `Only HTTP(S) URLs and same-origin absolute paths are supported.`
    );
  }

  return undefined;
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
