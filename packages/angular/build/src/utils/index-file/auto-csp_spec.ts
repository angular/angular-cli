/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { autoCsp, hashTextContent, isJavascriptMimeType } from './auto-csp';

// Utility function to grab the meta tag CSPs from the HTML response.
const getCsps = (html: string) => {
  return Array.from(
    html.matchAll(/<meta http-equiv="Content-Security-Policy" content="([^"]*)">/g),
  ).map((m) => m[1]); // Only capture group.
};

const CSP_SINGLE_HASH_REGEX =
  /script-src 'strict-dynamic' 'sha256-[^']+' https: 'unsafe-inline';object-src 'none';base-uri 'self';/;

const CSP_TWO_HASHES_REGEX =
  /script-src 'strict-dynamic' (?:'sha256-[^']+' ){2}https: 'unsafe-inline';object-src 'none';base-uri 'self';/;

const CSP_FOUR_HASHES_REGEX =
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
    expect(csps).toHaveSize(1);
    expect(csps[0]).toMatch(CSP_SINGLE_HASH_REGEX);
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
    expect(csps).toHaveSize(1);
    expect(csps[0]).toMatch(CSP_SINGLE_HASH_REGEX);
    expect(result).toContain(`const scripts = [['./main.js', "", false, false, null, null]];`);
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
    expect(csps).toHaveSize(1);
    expect(csps[0]).toMatch(CSP_SINGLE_HASH_REGEX);
    // Our loader script appears after the HTML text content.
    expect(result).toMatch(
      /Some text<\/div>\s*<script>\(\(\) => {\s*const scripts = \[\['.\/main.js', "", false, false, null, null\]\];/,
    );
  });

  it('should rewrite a multiple source scripts with attributes', async () => {
    const result = await autoCsp(`
      <html>
        <head>
          <script src="./head.js"></script>
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
    expect(csps).toHaveSize(1);
    expect(csps[0]).toMatch(CSP_TWO_HASHES_REGEX);
    expect(result).toContain(
      // eslint-disable-next-line max-len
      `const scripts = [['./main1.js', "", false, false, null, null],['./main2.js', "", true, false, null, null],['./main3.js', "module", true, true, null, null]];`,
    );
    // Head loader script is in the head.
    expect(result).toContain(`</script></head>`);
    // Only two loader scripts are created.
    expect(Array.from(result.matchAll(/<script>/gi)).length).toEqual(2);
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
    expect(csps).toHaveSize(1);
    expect(csps[0]).toMatch(CSP_SINGLE_HASH_REGEX);
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
    expect(csps).toHaveSize(1);
    // Exactly four hashes for the four scripts that remain (inline, loader, inline, loader).
    expect(csps[0]).toMatch(CSP_FOUR_HASHES_REGEX);
    expect(csps[0]).toContain(hashTextContent("console.log('foo');"));
    expect(csps[0]).toContain(hashTextContent("console.log('bar');"));
    // Loader script for main.js and main2.js appear after 'foo' and before 'bar'.
    expect(result).toMatch(
      // eslint-disable-next-line max-len
      /console.log\('foo'\);<\/script>\s*<script>\(\(\) => {\s*const scripts = \[\['.\/main.js', "", false, false, null, null\],\['.\/main2.js', "", false, false, null, null\]\];[\s\S]*console.log\('bar'\);/,
    );
    // Loader script for main3.js and main4.js appear after 'bar'.
    expect(result).toMatch(
      // eslint-disable-next-line max-len
      /console.log\('bar'\);<\/script>\s*<script>\(\(\) => {\s*const scripts = \[\['.\/main3.js', "", false, false, null, null\],\['.\/main4.js', "", false, false, null, null\]\];/,
    );
    // Exactly 4 scripts should be left.
    expect(Array.from(result.matchAll(/<script>/gi)).length).toEqual(4);
  });

  it('should write a loader script that appends to head', async () => {
    const result = await autoCsp(`
      <html>
        <head>
          <script src="./head.js"></script>
        </head>
        <body>
          <div>Some text </div>
        </body>
      </html>
    `);

    const csps = getCsps(result);
    expect(csps).toHaveSize(1);
    expect(csps[0]).toMatch(CSP_SINGLE_HASH_REGEX);

    expect(result).toContain(
      // eslint-disable-next-line max-len
      `document.lastElementChild.appendChild`,
    );
    // Head loader script is in the head.
    expect(result).toContain(`</script></head>`);
    // Only one loader script is created.
    expect(Array.from(result.matchAll(/<script>/gi)).length).toEqual(1);
  });

  it('should rewrite a single inline script with CRLF', async () => {
    const result = await autoCsp(`
      <html>
        <head>
        </head>
        <body>
          <script>\r\nconsole.log('foo');\r\n</script>
          <div>Some text </div>
        </body>
      </html>\r\n
    `);

    const csps = getCsps(result);
    expect(result).not.toContain(`\r\n`);
    expect(csps).toHaveSize(1);
    expect(csps[0]).toMatch(CSP_SINGLE_HASH_REGEX);
    expect(csps[0]).toContain(hashTextContent(`\r\nconsole.log('foo');\r\n`));
  });

  it('should preserve integrity and crossorigin attributes in loader script', async () => {
    const result = await autoCsp(`
      <html>
        <head>
        </head>
        <body>
          <script src="./main.js" type="module" crossorigin="anonymous" integrity="sha384-xyz123"></script>
          <div>Some text </div>
        </body>
      </html>
    `);

    const csps = getCsps(result);
    expect(csps).toHaveSize(1);
    expect(csps[0]).toMatch(CSP_SINGLE_HASH_REGEX);
    expect(result).toContain(
      `const scripts = [['./main.js', "module", false, false, "sha384-xyz123", "anonymous"]];`,
    );
  });

  it('should preserve only integrity attribute when crossorigin is omitted', async () => {
    const result = await autoCsp(`
      <html>
        <head>
        </head>
        <body>
          <script src="./main.js" integrity="sha384-xyz123"></script>
          <div>Some text </div>
        </body>
      </html>
    `);

    const csps = getCsps(result);
    expect(csps).toHaveSize(1);
    expect(csps[0]).toMatch(CSP_SINGLE_HASH_REGEX);
    expect(result).toContain(
      `const scripts = [['./main.js', "", false, false, "sha384-xyz123", null]];`,
    );
  });

  it('should map empty crossorigin attribute to anonymous', async () => {
    const result = await autoCsp(`
      <html>
        <head>
        </head>
        <body>
          <script src="./main.js" crossorigin></script>
          <div>Some text </div>
        </body>
      </html>
    `);

    const csps = getCsps(result);
    expect(csps).toHaveSize(1);
    expect(csps[0]).toMatch(CSP_SINGLE_HASH_REGEX);
    expect(result).toContain(
      `const scripts = [['./main.js', "", false, false, null, "anonymous"]];`,
    );
  });

  it('should rewrite scripts with application/javascript type', async () => {
    const result = await autoCsp(`
      <html>
        <head></head>
        <body>
          <script src="./main.js" type="application/javascript"></script>
        </body>
      </html>
    `);

    const csps = getCsps(result);
    expect(csps).toHaveSize(1);
    expect(csps[0]).toMatch(CSP_SINGLE_HASH_REGEX);
    expect(result).toContain(
      `const scripts = [['./main.js', "application/javascript", false, false, null, null]];`,
    );
  });

  it('should rewrite scripts with case-insensitive type and parameters with whitespace', async () => {
    const result = await autoCsp(`
      <html>
        <head></head>
        <body>
          <script src="./main.js" type="Text/JavaScript ; charset=utf-8"></script>
        </body>
      </html>
    `);

    const csps = getCsps(result);
    expect(csps).toHaveSize(1);
    expect(csps[0]).toMatch(CSP_SINGLE_HASH_REGEX);
    expect(result).toContain(
      `const scripts = [['./main.js', "Text/JavaScript ; charset=utf-8", false, false, null, null]];`,
    );
  });

  it('should rewrite scripts with case-insensitive module type', async () => {
    const result = await autoCsp(`
      <html>
        <head></head>
        <body>
          <script src="./main.js" type="Module"></script>
        </body>
      </html>
    `);

    const csps = getCsps(result);
    expect(csps).toHaveSize(1);
    expect(csps[0]).toMatch(CSP_SINGLE_HASH_REGEX);
    expect(result).toContain(
      `const scripts = [['./main.js', "Module", false, false, null, null]];`,
    );
  });

  it('should not rewrite non-JavaScript script tags', async () => {
    const result = await autoCsp(`
      <html>
        <head></head>
        <body>
          <script src="./data.json" type="application/json"></script>
        </body>
      </html>
    `);

    // No dynamic loader script is emitted because application/json is not JavaScript.
    expect(result).toContain('<script src="./data.json" type="application/json"></script>');
    expect(result).not.toContain('const scripts =');
  });

  it('should encode a script type that carries MIME parameters', async () => {
    const result = await autoCsp(`
      <html>
        <head>
        </head>
        <body>
          <script src="./main.js" type="text/javascript;']];var x=1;var junk=[['a','b"></script>
        </body>
      </html>
    `);

    const csps = getCsps(result);
    expect(csps).toHaveSize(1);
    expect(csps[0]).toMatch(CSP_SINGLE_HASH_REGEX);
    // The type stays inside its string literal.
    expect(result).toContain(
      `const scripts = [['./main.js', "text/javascript;']];var x=1;var junk=[['a','b", false, false, null, null]];`,
    );
  });

  it('should encode a script type that contains a closing script tag', async () => {
    const result = await autoCsp(`
      <html>
        <head>
        </head>
        <body>
          <script src="./main.js" type="text/javascript;</script><script>x</script>"></script>
        </body>
      </html>
    `);

    const csps = getCsps(result);
    expect(csps).toHaveSize(1);
    expect(csps[0]).toMatch(CSP_SINGLE_HASH_REGEX);
    // Only the loader element is emitted.
    expect(Array.from(result.matchAll(/<script/gi)).length).toEqual(1);
  });

  describe('isJavascriptMimeType', () => {
    it('should identify standard JavaScript MIME types', () => {
      expect(isJavascriptMimeType('text/javascript')).toBeTrue();
      expect(isJavascriptMimeType('application/javascript')).toBeTrue();
      expect(isJavascriptMimeType('application/x-javascript')).toBeTrue();
      expect(isJavascriptMimeType('text/ecmascript')).toBeTrue();
      expect(isJavascriptMimeType('application/ecmascript')).toBeTrue();
      expect(isJavascriptMimeType('text/jscript')).toBeTrue();
      expect(isJavascriptMimeType('text/livescript')).toBeTrue();
      expect(isJavascriptMimeType('text/x-ecmascript')).toBeTrue();
      expect(isJavascriptMimeType('text/x-javascript')).toBeTrue();
      expect(isJavascriptMimeType('text/javascript1.5')).toBeTrue();
    });

    it('should ignore parameters when matching MIME type', () => {
      expect(isJavascriptMimeType('text/javascript; charset=utf-8')).toBeTrue();
      expect(isJavascriptMimeType('application/javascript;version=1.8')).toBeTrue();
    });

    it('should handle leading, trailing, and parameter whitespace', () => {
      expect(isJavascriptMimeType('  text/javascript  ')).toBeTrue();
      expect(isJavascriptMimeType('text/javascript ; charset=utf-8')).toBeTrue();
      expect(isJavascriptMimeType(' application/javascript ; version=1.0 ')).toBeTrue();
    });

    it('should be case-insensitive', () => {
      expect(isJavascriptMimeType('Text/JavaScript')).toBeTrue();
      expect(isJavascriptMimeType('APPLICATION/JAVASCRIPT')).toBeTrue();
      expect(isJavascriptMimeType('text/JAVASCRIPT; charset=UTF-8')).toBeTrue();
    });

    it('should reject non-JavaScript MIME types', () => {
      expect(isJavascriptMimeType('application/json')).toBeFalse();
      expect(isJavascriptMimeType('text/html')).toBeFalse();
      expect(isJavascriptMimeType('text/css')).toBeFalse();
      expect(isJavascriptMimeType('image/svg+xml')).toBeFalse();
      expect(isJavascriptMimeType('importmap')).toBeFalse();
      expect(isJavascriptMimeType('module')).toBeFalse();
      expect(isJavascriptMimeType('')).toBeFalse();
    });

    it('should reject invalid MIME types with whitespace inside the essence', () => {
      expect(isJavascriptMimeType('text / javascript')).toBeFalse();
      expect(isJavascriptMimeType('application / javascript')).toBeFalse();
      expect(isJavascriptMimeType('text/java script')).toBeFalse();
    });
  });
});
