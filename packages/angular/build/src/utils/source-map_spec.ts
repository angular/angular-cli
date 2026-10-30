/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {
  isTrailingSourceMapComment,
  loadInputSourceMap,
  loadInputSourceMapFromUrl,
  removeSourceMappingURL,
} from './source-map';

describe('removeSourceMappingURL', () => {
  it('should remove top-level sourcemap comments', () => {
    const code = 'console.log("hello");\n//# sourceMappingURL=main.js.map';
    expect(removeSourceMappingURL(code)).toBe('console.log("hello");\n');
  });

  it('should not remove sourcemap comments inside double-quoted strings', () => {
    const code = 'const str = "//# sourceMappingURL=inline.js.map";';
    expect(removeSourceMappingURL(code)).toBe(code);
  });

  it('should not remove sourcemap comments inside single-quoted strings', () => {
    const code = "const str = '//# sourceMappingURL=inline.js.map';";
    expect(removeSourceMappingURL(code)).toBe(code);
  });

  it('should not remove sourcemap comments inside template literals', () => {
    const code = 'const str = `\n//# sourceMappingURL=inline.js.map\n`;';
    expect(removeSourceMappingURL(code)).toBe(code);
  });

  it('should not remove sourcemap comments inside block comments', () => {
    const code = '/*\n//# sourceMappingURL=inline.js.map\n*/';
    expect(removeSourceMappingURL(code)).toBe(code);

    const sameLineClose = '/*\n//# sourceMappingURL=inline.js.map*/';
    expect(removeSourceMappingURL(sameLineClose)).toBe(sameLineClose);
  });

  it('should not remove sourcemap comments inside normal single-line comments', () => {
    const code = '// Some description of //# sourceMappingURL=inline.js.map';
    expect(removeSourceMappingURL(code)).toBe(code);
  });

  it('should remove multiple top-level sourcemap comments while preserving subsequent line numbers', () => {
    const code =
      '  //# sourceMappingURL=first.js.map\nconsole.log("mid");\n//# sourceMappingURL=second.js.map';
    expect(removeSourceMappingURL(code)).toBe('\nconsole.log("mid");\n');
  });

  it('should preserve the line terminator when a sourcemap comment follows code on the same line', () => {
    const code =
      'foo(); //# sourceMappingURL=first.js.map\nbar();\n//# sourceMappingURL=second.js.map';
    expect(removeSourceMappingURL(code)).toBe('foo(); \nbar();\n');
  });

  it('should strip trailing whitespace consistently between the fast path and the fallback', () => {
    const trailing = 'a();\n  //# sourceMappingURL=main.js.map  \n\n';
    // Single trailing comment uses the fast path
    expect(removeSourceMappingURL(trailing)).toBe('a();\n');
    // An earlier occurrence forces the oxc fallback while preserving line numbers
    expect(removeSourceMappingURL('//# sourceMappingURL=first.js.map\n' + trailing)).toBe(
      '\na();\n',
    );
  });

  it('should strip non-trailing sourcemap comments after non-ASCII content', () => {
    const code =
      'const s = "héllo 😀 日本";\n//# sourceMappingURL=a.js.map\nconst t = 1;\n//# sourceMappingURL=b.js.map';
    expect(removeSourceMappingURL(code)).toBe('const s = "héllo 😀 日本";\n\nconst t = 1;\n');
  });

  it('should strip trailing inline sourcemaps using base64url characters via the fast path', () => {
    const code = 'a();\n//# sourceMappingURL=data:application/json;base64,eyJ2-_9==\n';
    expect(removeSourceMappingURL(code)).toBe('a();\n');
  });

  it('should not remove sourcemap comments inside strings containing escaped quotes', () => {
    const codeDouble = 'const str = "escaped \\" //# sourceMappingURL=inline.js.map";';
    expect(removeSourceMappingURL(codeDouble)).toBe(codeDouble);

    const codeSingle = "const str = 'escaped \\' //# sourceMappingURL=inline.js.map';";
    expect(removeSourceMappingURL(codeSingle)).toBe(codeSingle);
  });

  it('should handle strings containing escaped backslashes correctly', () => {
    const code = 'const str = "backslash \\\\";\n//# sourceMappingURL=main.js.map';
    expect(removeSourceMappingURL(code)).toBe('const str = "backslash \\\\";\n');
  });

  it('should not remove sourcemap comments inside template literal interpolations', () => {
    const code = 'const str = `hello ${"//# sourceMappingURL=inline.js.map"} world`;';
    expect(removeSourceMappingURL(code)).toBe(code);
  });

  it('should not remove sourcemap comments inside nested template literals', () => {
    const code = 'const str = `nested ${`inner ${"//# sourceMappingURL=inline.js.map"}`}`;';
    expect(removeSourceMappingURL(code)).toBe(code);
  });

  it('should not remove sourcemap comments inside nested template literals without inner quotes', () => {
    const code = 'const str = `nested ${`inner //# sourceMappingURL=inline.js.map`}`;';
    expect(removeSourceMappingURL(code)).toBe(code);
  });

  it('should not remove inline base64 sourcemap comments inside template literals closing on the same line', () => {
    const base64 = Buffer.from('{"version":3}').toString('base64');
    const code = `const str = \`\n//# sourceMappingURL=data:application/json;base64,${base64}\`;`;
    expect(removeSourceMappingURL(code)).toBe(code);
  });

  it('should not remove sourcemap comments inside regex literals', () => {
    const code = 'const regex = /\\/\\/# sourceMappingURL=inline.js.map/;';
    expect(removeSourceMappingURL(code)).toBe(code);
  });

  it('should not corrupt strings following regex literals containing quotes or backticks', () => {
    const doubleQuoteCode =
      'const pattern = /"/; const text = "//# sourceMappingURL=not-a-comment";';
    expect(removeSourceMappingURL(doubleQuoteCode)).toBe(doubleQuoteCode);

    const singleQuoteCode =
      "const pattern = /'/; const text = '//# sourceMappingURL=not-a-comment';";
    expect(removeSourceMappingURL(singleQuoteCode)).toBe(singleQuoteCode);

    const backtickCode = 'const pattern = /`/; const text = `//# sourceMappingURL=not-a-comment`;';
    expect(removeSourceMappingURL(backtickCode)).toBe(backtickCode);
  });

  it('should handle regex character classes and escapes containing slashes and quotes', () => {
    const body =
      'const pattern = /[/"\'`]/; const escaped = /\\/"\\[/; const text = "//# sourceMappingURL=not-a-comment";\n';
    expect(removeSourceMappingURL(body + '//# sourceMappingURL=main.js.map')).toBe(body);

    const charClassComment = 'const re = /[//# sourceMappingURL=foo.js.map]/;';
    expect(removeSourceMappingURL(charClassComment)).toBe(charClassComment);
  });

  it('should handle regex literals after keywords, control-flow conditions, and spread operators', () => {
    const code = [
      'export default /"/;',
      'if (enabled) /"/.test(val) ? doA() : doB();',
      'const matches = [.../"/.exec(str) ?? []];',
      'function* gen() { return [...yield /"/]; }',
      'const text = "//# sourceMappingURL=not-a-comment";',
      '//# sourceMappingURL=main.js.map',
    ].join('\n');

    expect(removeSourceMappingURL(code)).toBe(
      [
        'export default /"/;',
        'if (enabled) /"/.test(val) ? doA() : doB();',
        'const matches = [.../"/.exec(str) ?? []];',
        'function* gen() { return [...yield /"/]; }',
        'const text = "//# sourceMappingURL=not-a-comment";',
        '',
      ].join('\n'),
    );
  });

  it('should not affect division expressions including contextual keywords and postfix operators', () => {
    const ratioCode = 'const ratio = 10 / 2;\n//# sourceMappingURL=main.js.map';
    expect(removeSourceMappingURL(ratioCode)).toBe('const ratio = 10 / 2;\n');

    const fnBody =
      'function pct(n, of) { const r = of / 100 + i++ / 2;' +
      ' const s = "//# sourceMappingURL=not-a-comment"; return r + s; }\n';
    expect(removeSourceMappingURL(fnBody + '//# sourceMappingURL=main.js.map')).toBe(fnBody);
  });

  it('should only remove exact sourceMappingURL prefix comments', () => {
    const code = '// # sourceMappingURL=main.js.map\n//# sourceMappingURL=main.js.map';
    expect(removeSourceMappingURL(code)).toBe('// # sourceMappingURL=main.js.map\n');
  });

  it('should return the exact input string when no sourcemap comment is present', () => {
    const code = 'const x = 1;\nconsole.log(x);';
    expect(removeSourceMappingURL(code)).toBe(code);
  });

  it('should handle sourcemap comments with CRLF newlines', () => {
    const midFile = 'console.log("hello");\r\n//# sourceMappingURL=main.js.map\r\nconst next = 2;';
    expect(removeSourceMappingURL(midFile)).toBe('console.log("hello");\r\n\r\nconst next = 2;');

    const trailing = 'console.log("hello");\r\n//# sourceMappingURL=main.js.map\r\n';
    expect(removeSourceMappingURL(trailing)).toBe('console.log("hello");\r\n');
  });

  describe('with Uint8Array / Buffer inputs', () => {
    it('should strip trailing sourcemap comment from Uint8Array buffer', () => {
      const buffer = Buffer.from(
        'console.log("hello");\n//# sourceMappingURL=main.js.map',
        'utf-8',
      );
      const result = removeSourceMappingURL(buffer);

      expect(Buffer.from(result).toString('utf-8')).toBe('console.log("hello");\n');
    });

    it('should return exact input buffer when no sourcemap comment is present', () => {
      const buffer = Buffer.from('console.log("hello");\nconst x = 1;', 'utf-8');
      const result = removeSourceMappingURL(buffer);

      expect(result).toBe(buffer);
    });

    it('should handle multiple sourcemap comments in a buffer via fallback', () => {
      const buffer = Buffer.from(
        '//# sourceMappingURL=first.js.map\nconsole.log("mid");\n//# sourceMappingURL=second.js.map',
        'utf-8',
      );
      const result = removeSourceMappingURL(buffer);

      expect(Buffer.from(result).toString('utf-8')).toBe('\nconsole.log("mid");\n');
    });

    it('should strip non-trailing comments after non-ASCII content in a buffer via fallback', () => {
      const buffer = Buffer.from(
        'const s = "héllo 😀 日本";\n//# sourceMappingURL=a.js.map\nconst t = 1;\n//# sourceMappingURL=b.js.map',
        'utf-8',
      );
      const result = removeSourceMappingURL(buffer);

      expect(Buffer.from(result).toString('utf-8')).toBe(
        'const s = "héllo 😀 日本";\n\nconst t = 1;\n',
      );
    });

    it('should not strip sourcemap comments inside template strings in a buffer', () => {
      const buffer = Buffer.from('const str = `\n//# sourceMappingURL=inline.js.map\n`;', 'utf-8');
      const result = removeSourceMappingURL(buffer);

      expect(Buffer.from(result).toString('utf-8')).toBe(buffer.toString('utf-8'));
    });

    it('should preserve strings after regex literals with quotes when falling back on a buffer', () => {
      const buffer = Buffer.from(
        'const pattern = /"/; const text = "//# sourceMappingURL=not-a-comment";\n//# sourceMappingURL=main.js.map',
        'utf-8',
      );
      const result = removeSourceMappingURL(buffer);

      expect(Buffer.from(result).toString('utf-8')).toBe(
        'const pattern = /"/; const text = "//# sourceMappingURL=not-a-comment";\n',
      );
    });
  });
});

describe('loadInputSourceMapFromUrl', () => {
  it('should decode inline base64 sourcemaps', () => {
    const map = { version: 3, sources: ['foo.ts'], mappings: 'AAAA;' };
    const base64 = Buffer.from(JSON.stringify(map)).toString('base64');
    const urlLine = `data:application/json;charset=utf-8;base64,${base64}\n`;

    expect(loadInputSourceMapFromUrl('/src/foo.js', urlLine)).toEqual(map as never);
  });

  it('should return undefined for invalid base64 payloads', () => {
    expect(
      loadInputSourceMapFromUrl('/src/foo.js', 'data:application/json;base64,invalid!!!'),
    ).toBeUndefined();
  });

  it('should return undefined when no base64 marker is found in data URI', () => {
    expect(
      loadInputSourceMapFromUrl('/src/foo.js', 'data:application/json;utf8,{}'),
    ).toBeUndefined();
  });
});

describe('loadInputSourceMap', () => {
  it('should extract and decode sourcemap from source string', () => {
    const map = { version: 3, sources: ['foo.ts'], mappings: 'AAAA;' };
    const base64 = Buffer.from(JSON.stringify(map)).toString('base64');
    const code = `console.log("hello");\n//# sourceMappingURL=data:application/json;base64,${base64}\n`;

    expect(loadInputSourceMap('/src/foo.js', code)).toEqual(map as never);
  });

  it('should return undefined when no sourceMappingURL comment is present', () => {
    expect(loadInputSourceMap('/src/foo.js', 'console.log("hello");')).toBeUndefined();
  });

  it('should return undefined for comments inside template strings with code after them', () => {
    const map = { version: 3, sources: ['foo.ts'], mappings: 'AAAA;' };
    const base64 = Buffer.from(JSON.stringify(map)).toString('base64');
    const code = `const str = \`\n//# sourceMappingURL=data:application/json;base64,${base64}\n\`;\nconsole.log(str);`;

    expect(loadInputSourceMap('/src/foo.js', code)).toBeUndefined();
  });

  it('should return undefined for comments inside template strings ending with backticks', () => {
    const map = { version: 3, sources: ['foo.ts'], mappings: 'AAAA;' };
    const base64 = Buffer.from(JSON.stringify(map)).toString('base64');
    const code = `const str = \`\n//# sourceMappingURL=data:application/json;base64,${base64}\n\`;`;

    expect(loadInputSourceMap('/src/foo.js', code)).toBeUndefined();
  });

  it('should return undefined for single-line template literals', () => {
    const map = { version: 3, sources: ['foo.ts'], mappings: 'AAAA;' };
    const base64 = Buffer.from(JSON.stringify(map)).toString('base64');
    const code = `const str = \`//# sourceMappingURL=data:application/json;base64,${base64}\`;`;

    expect(loadInputSourceMap('/src/foo.js', code)).toBeUndefined();
  });
});

describe('isTrailingSourceMapComment', () => {
  it('should return true for valid inline data URIs at end of file', () => {
    const map = { version: 3, sources: ['foo.ts'], mappings: 'AAAA;' };
    const base64 = Buffer.from(JSON.stringify(map)).toString('base64');
    const urlLine = `data:application/json;charset=utf-8;base64,${base64}\n`;

    expect(isTrailingSourceMapComment(urlLine)).toBe(true);
  });

  it('should return true for external sourcemap URLs at end of file', () => {
    expect(isTrailingSourceMapComment('main.js.map\n')).toBe(true);
    expect(isTrailingSourceMapComment('main.js.map')).toBe(true);
  });

  it('should return false when followed by non-whitespace characters', () => {
    expect(isTrailingSourceMapComment('main.js.map\n`;\nconsole.log("hi");')).toBe(false);
    expect(isTrailingSourceMapComment('main.js.map`;')).toBe(false);
  });

  it('should return false for invalid data URI format', () => {
    expect(isTrailingSourceMapComment('data:application/json;utf8,{}')).toBe(false);
  });

  it('should accept base64url characters in inline data URIs', () => {
    expect(isTrailingSourceMapComment('data:application/json;base64,eyJ2-_9==\n')).toBe(true);
  });

  it('should return false when an inline payload is immediately followed by non-base64 characters', () => {
    expect(isTrailingSourceMapComment('data:application/json;base64,eyJ2`;')).toBe(false);
    expect(isTrailingSourceMapComment('data:application/json;base64,eyJ2*/')).toBe(false);
    expect(isTrailingSourceMapComment('data:application/json;base64,')).toBe(false);
  });

  it('should return false when an external URL contains a block comment terminator', () => {
    expect(isTrailingSourceMapComment('main.js.map*/')).toBe(false);
  });
});
