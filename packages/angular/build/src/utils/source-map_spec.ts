/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { removeSourceMappingURL } from './source-map';

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
  });

  it('should not remove sourcemap comments inside normal single-line comments', () => {
    const code = '// Some description of //# sourceMappingURL=inline.js.map';
    expect(removeSourceMappingURL(code)).toBe(code);
  });

  it('should remove multiple top-level sourcemap comments', () => {
    const code =
      '//# sourceMappingURL=first.js.map\nconsole.log("mid");\n//# sourceMappingURL=second.js.map';
    expect(removeSourceMappingURL(code)).toBe('\nconsole.log("mid");\n');
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

  it('should not remove sourcemap comments inside regex literals', () => {
    const code = 'const regex = /\\/\\/# sourceMappingURL=inline.js.map/;';
    expect(removeSourceMappingURL(code)).toBe(code);
  });

  it('should not affect normal division operators', () => {
    const code = 'const ratio = 10 / 2;\n//# sourceMappingURL=main.js.map';
    expect(removeSourceMappingURL(code)).toBe('const ratio = 10 / 2;\n');
  });

  it('should only remove exact sourceMappingURL prefix comments', () => {
    const code = '// # sourceMappingURL=main.js.map\n//# sourceMappingURL=main.js.map';
    expect(removeSourceMappingURL(code)).toBe('// # sourceMappingURL=main.js.map\n');
  });
});
