/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { autoCsp, hashTextContent } from './auto-csp';

// Utility function to grab the meta tag CSPs from the HTML response.
const getCsps = (html: string) => {
  return Array.from(
    html.matchAll(/<meta http-equiv="Content-Security-Policy" content="([^"]*)">/g),
  ).map((m) => m[1]); // Only capture group.
};

const ONE_HASH_CSP =
  /script-src 'strict-dynamic' 'sha256-[^']+' https: 'unsafe-inline';object-src 'none';base-uri 'self';/;

const FOUR_HASH_CSP =
  /script-src 'strict-dynamic' (?:'sha256-[^']+' ){4}https: 'unsafe-inline';object-src 'none';base-uri 'self';/;

describe('auto-csp', () => {
  it('should rewrite a single inline script', async () => {
    const result = await autoCsp(`
      <html>
        <head>
        </head>
        <body>
          <script>console.log('foo');</script>
          <div>Some text </div>
        </body>
      </html>
    `);

    const csps = getCsps(result);
    expect(csps.length).toBe(1);
    expect(csps[0]).toMatch(ONE_HASH_CSP);
    expect(csps[0]).toContain(hashTextContent("console.log('foo');"));
  });

  it('should rewrite a single source script', async () => {
    const result = await autoCsp(`
      <html>
        <head>
        </head>
        <body>
          <script src="./main.js"></script>
          <div>Some text </div>
        </body>
      </html>
    `);

    const csps = getCsps(result);
    expect(csps.length).toBe(1);
    expect(csps[0]).toMatch(ONE_HASH_CSP);
    expect(result).toContain(`var scripts = [['./main.js', undefined, false, false]];`);
  });

  it('should rewrite a single source script in place', async () => {
    const result = await autoCsp(`
      <html>
        <head>
        </head>
        <body>
          <div>Some text</div>
          <script src="./main.js"></script>
        </body>
      </html>
    `);

    const csps = getCsps(result);
    expect(csps.length).toBe(1);
    expect(csps[0]).toMatch(ONE_HASH_CSP);
    // Our loader script appears after the HTML text content.
    expect(result).toMatch(
      /Some text<\/div>\s*<script>\s*var scripts = \[\['.\/main.js', undefined, false, false\]\];/,
    );
  });

  it('should rewrite a multiple source scripts with attributes', async () => {
    const result = await autoCsp(`
      <html>
        <head>
        </head>
        <body>
          <script src="./main1.js"></script>
          <script async src="./main2.js"></script>
          <script type="module" async defer src="./main3.js"></script>
          <script type="application/not-javascript" src="./main4.js"></script>
          <div>Some text </div>
        </body>
      </html>
    `);

    const csps = getCsps(result);
    expect(csps.length).toBe(1);
    expect(csps[0]).toMatch(ONE_HASH_CSP);
    expect(result).toContain(
      // eslint-disable-next-line max-len
      `var scripts = [['./main1.js', undefined, false, false],['./main2.js', undefined, true, false],['./main3.js', 'module', true, true]];`,
    );
    // Only one loader script is created.
    expect(Array.from(result.matchAll(/<script>/g)).length).toEqual(1);
  });

  it('should rewrite source scripts with weird URLs', async () => {
    const result = await autoCsp(`
      <html>
        <head>
        </head>
        <body>
          <script src="/foo&amp;bar"></script>
          <script src="/one'two\\'three\\\\'four\\\\\\'five"></script>
          <script src="/one&two&amp;three&amp;amp;four"></script>
          <script src="./</script>"></script>
          <div>Some text </div>
        </body>
      </html>
    `);

    const csps = getCsps(result);
    expect(csps.length).toBe(1);
    expect(csps[0]).toMatch(ONE_HASH_CSP);
    // &amp; encodes correctly
    expect(result).toContain(`'/foo&bar'`);
    // Impossible to escape a string and create invalid loader JS with a '
    // (Quotes and backslashes work)
    expect(result).toContain(`'/one\\'two%5C\\'three%5C%5C\\'four%5C%5C%5C\\'five'`);
    // HTML entities work
    expect(result).toContain(`'/one&two&three&amp;four'`);
    // Cannot escape JS context to HTML
    expect(result).toContain(`'./%3C/script%3E'`);
  });

  it('should rewrite all script tags', async () => {
    const result = await autoCsp(`
      <html>
        <head>
        </head>
        <body>
          <script>console.log('foo');</script>
          <script src="./main.js"></script>
          <script src="./main2.js"></script>
          <script>console.log('bar');</script>
          <script src="./main3.js"></script>
          <script src="./main4.js"></script>
          <div>Some text </div>
        </body>
      </html>
    `);

    const csps = getCsps(result);
    expect(csps.length).toBe(1);
    // Exactly four hashes for the four scripts that remain (inline, loader, inline, loader).
    expect(csps[0]).toMatch(FOUR_HASH_CSP);
    expect(csps[0]).toContain(hashTextContent("console.log('foo');"));
    expect(csps[0]).toContain(hashTextContent("console.log('bar');"));
    // Loader script for main.js and main2.js appear after 'foo' and before 'bar'.
    expect(result).toMatch(
      // eslint-disable-next-line max-len
      /console.log\('foo'\);<\/script>\s*<script>\s*var scripts = \[\['.\/main.js', undefined, false, false\],\['.\/main2.js', undefined, false, false\]\];[\s\S]*console.log\('bar'\);/,
    );
    // Loader script for main3.js and main4.js appear after 'bar'.
    expect(result).toMatch(
      // eslint-disable-next-line max-len
      /console.log\('bar'\);<\/script>\s*<script>\s*var scripts = \[\['.\/main3.js', undefined, false, false\],\['.\/main4.js', undefined, false, false\]\];/,
    );
    // Exactly 4 scripts should be left.
    expect(Array.from(result.matchAll(/<script>/g)).length).toEqual(4);
  });
});
