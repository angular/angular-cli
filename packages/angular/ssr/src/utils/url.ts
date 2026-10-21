/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { DefaultUrlSerializer } from '@angular/router';

/**
 * Removes the trailing slash from a URL if it exists.
 *
 * @param url - The URL string from which to remove the trailing slash.
 * @returns The URL string without a trailing slash.
 *
 * @example
 * ```js
 * stripTrailingSlash('path/'); // 'path'
 * stripTrailingSlash('/path');  // '/path'
 * stripTrailingSlash('/'); // '/'
 * stripTrailingSlash(''); // ''
 * ```
 */
export function stripTrailingSlash(url: string): string {
  // Check if the last character of the URL is a slash
  return url.length > 1 && url.at(-1) === '/' ? url.slice(0, -1) : url;
}

/**
 * Removes the leading slash from a URL if it exists.
 *
 * @param url - The URL string from which to remove the leading slash.
 * @returns The URL string without a leading slash.
 *
 * @example
 * ```js
 * stripLeadingSlash('/path'); // 'path'
 * stripLeadingSlash('/path/');  // 'path/'
 * stripLeadingSlash('/'); // '/'
 * stripLeadingSlash(''); // ''
 * ```
 */
export function stripLeadingSlash(url: string): string {
  // Check if the first character of the URL is a slash
  return url.length > 1 && url[0] === '/' ? url.slice(1) : url;
}

/**
 * Adds a leading slash to a URL if it does not already have one.
 *
 * @param url - The URL string to which the leading slash will be added.
 * @returns The URL string with a leading slash.
 *
 * @example
 * ```js
 * addLeadingSlash('path'); // '/path'
 * addLeadingSlash('/path'); // '/path'
 * ```
 */
export function addLeadingSlash(url: string): string {
  // Check if the URL already starts with a slash
  return url[0] === '/' ? url : `/${url}`;
}

/**
 * Adds a trailing slash to a URL if it does not already have one.
 *
 * @param url - The URL string to which the trailing slash will be added.
 * @returns The URL string with a trailing slash.
 *
 * @example
 * ```js
 * addTrailingSlash('path'); // 'path/'
 * addTrailingSlash('path/'); // 'path/'
 * ```
 */
export function addTrailingSlash(url: string): string {
  // Check if the URL already end with a slash
  return url.at(-1) === '/' ? url : `${url}/`;
}

/**
 * Joins URL parts into a single URL string.
 *
 * This function takes multiple URL segments, normalizes them by removing leading
 * and trailing slashes where appropriate, and then joins them into a single URL.
 *
 * @param parts - The parts of the URL to join. Each part can be a string with or without slashes.
 * @returns The joined URL string, with normalized slashes.
 *
 * @example
 * ```js
 * joinUrlParts('path/', '/to/resource'); // '/path/to/resource'
 * joinUrlParts('/path/', 'to/resource'); // '/path/to/resource'
 * joinUrlParts('', ''); // '/'
 * ```
 */
export function joinUrlParts(...parts: string[]): string {
  const normalizedParts: string[] = [];

  for (const part of parts) {
    if (part === '') {
      // Skip any empty parts
      continue;
    }

    let start = 0;
    let end = part.length;

    // Use "Pointers" to avoid intermediate slices
    while (start < end && part[start] === '/') {
      start++;
    }

    while (end > start && part[end - 1] === '/') {
      end--;
    }

    if (start < end) {
      normalizedParts.push(part.slice(start, end));
    }
  }

  return addLeadingSlash(normalizedParts.join('/'));
}

/**
 * Strips `/index.html` from the end of a URL's path, if present.
 *
 * This function is used to convert URLs pointing to an `index.html` file into their directory
 * equivalents. For example, it transforms a URL like `http://www.example.com/page/index.html`
 * into `http://www.example.com/page`.
 *
 * @param url - The URL object to process.
 * @returns A new URL object with `/index.html` removed from the path, if it was present.
 *
 * @example
 * ```typescript
 * const originalUrl = new URL('http://www.example.com/page/index.html');
 * const cleanedUrl = stripIndexHtmlFromURL(originalUrl);
 * console.log(cleanedUrl.href); // Output: 'http://www.example.com/page'
 * ```
 */
export function stripIndexHtmlFromURL(url: URL): URL {
  if (url.pathname.endsWith('/index.html')) {
    const modifiedURL = new URL(url);
    // Remove '/index.html' from the pathname
    modifiedURL.pathname = modifiedURL.pathname.slice(0, /** '/index.html'.length */ -11);

    return modifiedURL;
  }

  return url;
}

/**
 * Cached instance of `DefaultUrlSerializer` used for query parameter parsing and serialization.
 */
let urlSerializer: DefaultUrlSerializer | undefined;

/**
 * Resolves `*` and `*<n>` placeholders in the path of `toUrl` from `fromPath`, and `:name`
 * placeholders in the query of `toUrl` from `fromSearch`, matching Angular router redirect semantics.
 *
 * - Each `*` path segment is replaced with the segment at the same index in `fromPath`.
 * - Each `*<n>` path segment is replaced with the 1-based segment at position `n` in `fromPath`.
 * - When `fromSearch` is provided, each query parameter whose value is `:name` is replaced with the
 *   values of `name` from `fromSearch`, or `undefined` if missing. Repeated query parameters are not
 *   resolved, matching the Angular router.
 *
 * @param toUrl - A URL template string starting with `/`.
 * @param fromPath - A base path string starting with `/` that provides segments for path placeholders.
 * @param fromSearch - Optional query string (e.g. `url.search`) that provides values for query placeholders.
 * @returns The URL with its path and query placeholders resolved.
 *
 * @example
 * ```ts
 * buildUrlWithParams('/*\/details', '/123/abc'); // '/123/details'
 * buildUrlWithParams('/user/*2/*1', '/a/b'); // '/user/b/a'
 * buildUrlWithParams('/find?q=:x', '/search', '?x=cats'); // '/find?q=cats'
 * ```
 */
export function buildUrlWithParams(toUrl: string, fromPath: string, fromSearch?: string): string {
  if (toUrl[0] !== '/') {
    throw new Error(`Invalid toUrl: The string must start with a '/'. Received: '${toUrl}'`);
  }

  if (fromPath[0] !== '/') {
    throw new Error(`Invalid fromPath: The string must start with a '/'. Received: '${fromPath}'`);
  }

  if (!toUrl.includes('/*') && (fromSearch === undefined || !toUrl.includes('=:'))) {
    return toUrl;
  }

  const [path] = toUrl.split(/[?#]/, 1);
  let resolvedPath = path;
  let suffix = toUrl.slice(path.length);

  if (path.includes('/*')) {
    const fromPathParts = fromPath.split('/');
    resolvedPath = joinUrlParts(
      ...path
        .split('/')
        .map((part, index) =>
          part[0] === '*'
            ? (fromPathParts[part.length === 1 ? index : +part.slice(1)] ?? part)
            : part,
        ),
    );
  }

  if (fromSearch !== undefined && suffix[0] === '?' && suffix.includes('=:')) {
    urlSerializer ??= new DefaultUrlSerializer();
    const toTree = urlSerializer.parse(suffix);
    const actualParams = fromSearch ? urlSerializer.parse(fromSearch).queryParams : {};

    for (const [key, value] of Object.entries(toTree.queryParams)) {
      if (typeof value === 'string' && value[0] === ':') {
        toTree.queryParams[key] = actualParams[value.slice(1)];
      }
    }

    // `serialize(toTree)` returns `/?...#...` because `toTree.root` is empty.
    suffix = urlSerializer.serialize(toTree).slice(1);
  }

  return resolvedPath + suffix;
}

const MATRIX_PARAMS_REGEX = /;[^/]+/g;

/**
 * Removes Angular matrix parameters from a given URL path.
 *
 * This function takes a URL path string and removes any matrix parameters.
 * Matrix parameters are parts of a URL segment that start with a semicolon `;`.
 *
 * @param pathname - The URL path to remove matrix parameters from.
 * @returns The URL path with matrix parameters removed.
 *
 * @example
 * ```ts
 * stripMatrixParams('/path;param=value'); // returns '/path'
 * stripMatrixParams('/path;param=value/to;p=1/resource'); // returns '/path/to/resource'
 * stripMatrixParams('/path/to/resource'); // returns '/path/to/resource'
 * ```
 */
export function stripMatrixParams(pathname: string): string {
  // Use a regular expression to remove matrix parameters.
  // This regex finds all occurrences of a semicolon followed by any characters
  return pathname.includes(';') ? pathname.replace(MATRIX_PARAMS_REGEX, '') : pathname;
}

/**
 * Constructs a decoded URL string from its components.
 *
 * This function joins the pathname (with trailing slash removed), search, and hash,
 * and then decodes the result.
 *
 * @param pathname - The path of the URL.
 * @param search - The query string of the URL (including '?').
 * @param hash - The hash fragment of the URL (including '#').
 * @returns The constructed and decoded URL string.
 */
export function constructUrl(pathname: string, search: string, hash: string): string {
  return decodeURIComponent([stripTrailingSlash(pathname), search, hash].join(''));
}
