/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

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
  return url.length > 1 && url[url.length - 1] === '/' ? url.slice(0, -1) : url;
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
  return url[url.length - 1] === '/' ? url : `${url}/`;
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
  const normalizeParts: string[] = [];
  for (const part of parts) {
    if (part === '') {
      // Skip any empty parts
      continue;
    }

    let normalizedPart = part;
    if (part[0] === '/') {
      normalizedPart = normalizedPart.slice(1);
    }
    if (part[part.length - 1] === '/') {
      normalizedPart = normalizedPart.slice(0, -1);
    }
    if (normalizedPart !== '') {
      normalizeParts.push(normalizedPart);
    }
  }

  return addLeadingSlash(normalizeParts.join('/'));
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
 * Resolves `*` placeholders in a path template by mapping them to corresponding segments
 * from a base path. This is useful for constructing paths dynamically based on a given base path.
 *
 * The function processes the `toPath` string, replacing each `*` placeholder with
 * the corresponding segment from the `fromPath`. If the `toPath` contains no placeholders,
 * it is returned as-is. Invalid `toPath` formats (not starting with `/`) will throw an error.
 *
 * @param toPath - A path template string that may contain `*` placeholders. Each `*` is replaced
 * by the corresponding segment from the `fromPath`. Static paths (e.g., `/static/path`) are returned
 * directly without placeholder replacement.
 * @param fromPath - A base path string, split into segments, that provides values for
 * replacing `*` placeholders in the `toPath`.
 * @returns A resolved path string with `*` placeholders replaced by segments from the `fromPath`,
 * or the `toPath` returned unchanged if it contains no placeholders.
 *
 * @throws If the `toPath` does not start with a `/`, indicating an invalid path format.
 *
 * @example
 * ```typescript
 * // Example with placeholders resolved
 * const resolvedPath = buildPathWithParams('/*\/details', '/123/abc');
 * console.log(resolvedPath); // Outputs: '/123/details'
 *
 * // Example with a static path
 * const staticPath = buildPathWithParams('/static/path', '/base/unused');
 * console.log(staticPath); // Outputs: '/static/path'
 * ```
 */
export function buildPathWithParams(toPath: string, fromPath: string): string {
  if (toPath[0] !== '/') {
    throw new Error(`Invalid toPath: The string must start with a '/'. Received: '${toPath}'`);
  }

  if (fromPath[0] !== '/') {
    throw new Error(`Invalid fromPath: The string must start with a '/'. Received: '${fromPath}'`);
  }

  if (!toPath.includes('/*')) {
    return toPath;
  }

  const fromPathParts = fromPath.split('/');
  const toPathParts = toPath.split('/');
  const resolvedParts = toPathParts.map((part, index) =>
    toPathParts[index] === '*' ? fromPathParts[index] : part,
  );

  return joinUrlParts(...resolvedParts);
}
