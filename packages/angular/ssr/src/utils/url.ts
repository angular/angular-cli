/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { DefaultUrlSerializer, type Params, type UrlTree } from '@angular/router';

/**
 * A parsed path segment in a route or redirect URL template.
 *
 * - `static`: A literal path segment (e.g., `'users'`).
 * - `param`: A named route parameter segment starting with `:` (e.g., `':id'` -> `name: 'id'`).
 * - `wildcard`: A positional wildcard segment (`'*'` or `'*<n>'`).
 *   When `index` is defined, it is the 0-based index of the source segment to substitute;
 *   when `undefined`, it substitutes the source segment at the current segment position.
 */
export type PathSegment =
  | { readonly type: 'static'; readonly value: string }
  | { readonly type: 'param'; readonly name: string }
  | { readonly type: 'wildcard'; readonly index?: number };

/**
 * A parsed query parameter in a redirect URL template.
 *
 * - `static`: A literal query parameter value (single string or repeated `string[]`).
 * - `param`: A named query parameter placeholder (`?q=:term` -> `name: 'q'`, `param: 'term'`).
 */
export type QueryParam =
  | { readonly type: 'static'; readonly name: string; readonly value: string | string[] }
  | { readonly type: 'param'; readonly name: string; readonly param: string };

/**
 * Structured representation of a parsed URL or route template.
 */
export interface ParsedUrl {
  readonly isAbsolute: boolean;
  readonly segments: readonly PathSegment[];
  readonly queryParams: readonly QueryParam[];
  readonly fragment: string | null;
  readonly rawSuffix: string;
  readonly hasDynamicSegments: boolean;
  readonly hasDynamicQueryParams: boolean;
}

/**
 * Shared singleton for unindexed wildcard path segments (`'*'`).
 */
export const WILDCARD_SEGMENT: PathSegment = { type: 'wildcard' };

const EMPTY_QUERY_PARAMS: readonly QueryParam[] = [];
const POSITIONAL_WILDCARD_REGEX = /^\*\d+$/;

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
 * Cached instance of `DefaultUrlSerializer` and reusable empty `UrlTree` shell
 * used for query parameter parsing and serialization.
 */
let urlSerializer: DefaultUrlSerializer | undefined;
let serializationTree: UrlTree | undefined;

/**
 * Parses a single raw path segment string into a structured `PathSegment`.
 */
function parsePathSegment(segment: string): PathSegment {
  if (segment[0] === '*') {
    if (segment.length === 1) {
      return WILDCARD_SEGMENT;
    }

    if (POSITIONAL_WILDCARD_REGEX.test(segment)) {
      return { type: 'wildcard', index: Number(segment.slice(1)) };
    }
  } else if (segment[0] === ':' && segment.length > 1) {
    return { type: 'param', name: segment.slice(1) };
  }

  return { type: 'static', value: segment };
}

/**
 * Parses a URL path string into a 0-indexed array of structured `PathSegment` objects.
 * Leading, trailing, and consecutive slashes are ignored.
 *
 * @param path - The path string to parse (without query or fragment).
 * @returns An array of parsed `PathSegment` objects.
 */
export function parsePathSegments(path: string): PathSegment[] {
  const segments: PathSegment[] = [];
  let start = 0;
  const length = path.length;

  while (start < length) {
    while (start < length && path[start] === '/') {
      start++;
    }
    if (start >= length) {
      break;
    }

    let end = path.indexOf('/', start);
    if (end === -1) {
      end = length;
    }

    segments.push(parsePathSegment(path.slice(start, end)));
    start = end + 1;
  }

  return segments;
}

/**
 * Extracts raw non-empty segment strings from a URL pathname without allocating empty strings.
 */
function extractPathSegments(path: string): string[] {
  const segments: string[] = [];
  let start = 0;
  const length = path.length;

  while (start < length) {
    while (start < length && path[start] === '/') {
      start++;
    }
    if (start >= length) {
      break;
    }

    let end = path.indexOf('/', start);
    if (end === -1) {
      end = length;
    }

    segments.push(path.slice(start, end));
    start = end + 1;
  }

  return segments;
}

/**
 * Serializes a single `PathSegment` into its string representation.
 */
function serializePathSegment(segment: PathSegment): string {
  switch (segment.type) {
    case 'static':
      return segment.value;
    case 'param':
      return `:${segment.name}`;
    case 'wildcard':
      return segment.index === undefined ? '*' : `*${segment.index}`;
  }
}

/**
 * Serializes an array of `PathSegment` objects into a normalized path starting with `/`.
 */
export function serializePathSegments(segments: readonly PathSegment[]): string {
  let result = '';
  for (const segment of segments) {
    const value = serializePathSegment(segment);
    if (value) {
      result += '/' + value;
    }
  }

  return result || '/';
}

/**
 * Parses a URL or route template string into a structured `ParsedUrl`.
 *
 * Query parameters are parsed via `DefaultUrlSerializer` only when dynamic `:name` placeholders
 * may be present (`?=:` pattern), avoiding unnecessary serializer overhead for static query strings.
 */
export function parseUrl(url: string): ParsedUrl {
  const queryIndex = url.indexOf('?');
  const hashIndex = url.indexOf('#');
  const suffixIndex =
    queryIndex === -1 ? hashIndex : hashIndex === -1 ? queryIndex : Math.min(queryIndex, hashIndex);

  const path = suffixIndex === -1 ? url : url.slice(0, suffixIndex);
  const rawSuffix = suffixIndex === -1 ? '' : url.slice(suffixIndex);
  const segments = parsePathSegments(path);
  const hasDynamicSegments = segments.some((segment) => segment.type !== 'static');

  if (rawSuffix[0] === '?' && rawSuffix.includes('=:')) {
    urlSerializer ??= new DefaultUrlSerializer();
    const tree = urlSerializer.parse(rawSuffix);
    const queryParams: QueryParam[] = [];
    let hasDynamicQueryParams = false;

    for (const [name, value] of Object.entries(tree.queryParams)) {
      if (typeof value === 'string' && value[0] === ':') {
        queryParams.push({ type: 'param', name, param: value.slice(1) });
        hasDynamicQueryParams = true;
      } else {
        queryParams.push({ type: 'static', name, value });
      }
    }

    return {
      isAbsolute: path[0] === '/',
      segments,
      queryParams,
      fragment: tree.fragment,
      rawSuffix,
      hasDynamicSegments,
      hasDynamicQueryParams,
    };
  }

  return {
    isAbsolute: path[0] === '/',
    segments,
    queryParams: EMPTY_QUERY_PARAMS,
    fragment: hashIndex === -1 ? null : decodeURIComponent(url.slice(hashIndex + 1)),
    rawSuffix,
    hasDynamicSegments,
    hasDynamicQueryParams: false,
  };
}

/**
 * Resolves `*` and `*<n>` placeholders in the path of `toUrl` from `fromPath`, and `:name`
 * placeholders in the query of `toUrl` from `fromSearch`, matching Angular router redirect semantics.
 *
 * - Each `*` path segment is replaced with the segment at the same index in `fromPath`.
 * - Each `*<n>` path segment is replaced with the 0-based segment at position `n` in `fromPath`.
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
 * buildUrlWithParams('/user/*1/*0', '/a/b'); // '/user/b/a'
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

  const parsed = parseUrl(toUrl);
  if (!parsed.hasDynamicSegments && (fromSearch === undefined || !parsed.hasDynamicQueryParams)) {
    return toUrl;
  }

  let resolvedPath: string;
  if (parsed.hasDynamicSegments) {
    const fromSegments = extractPathSegments(fromPath);
    let builtPath = '';
    for (let i = 0; i < parsed.segments.length; i++) {
      const segment = parsed.segments[i];
      const value =
        segment.type === 'wildcard'
          ? (fromSegments[segment.index ?? i] ?? serializePathSegment(segment))
          : serializePathSegment(segment);
      if (value) {
        builtPath += '/' + value;
      }
    }
    resolvedPath = builtPath || '/';
  } else {
    resolvedPath = serializePathSegments(parsed.segments);
  }

  let suffix = parsed.rawSuffix;
  if (fromSearch !== undefined && parsed.hasDynamicQueryParams) {
    urlSerializer ??= new DefaultUrlSerializer();
    serializationTree ??= urlSerializer.parse('');
    const actualParams = fromSearch ? urlSerializer.parse(fromSearch).queryParams : {};
    const resolvedQueryParams: Params = {};

    for (const param of parsed.queryParams) {
      resolvedQueryParams[param.name] =
        param.type === 'param' ? actualParams[param.param] : param.value;
    }

    serializationTree.queryParams = resolvedQueryParams;
    serializationTree.fragment = parsed.fragment;
    // `serialize(serializationTree)` returns `/?...#...` because `serializationTree.root` is empty.
    suffix = urlSerializer.serialize(serializationTree).slice(1);
    serializationTree.queryParams = {};
    serializationTree.fragment = null;
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
