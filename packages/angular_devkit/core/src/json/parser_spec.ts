/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {JsonParseMode, parseJson, parseJsonAst} from './parser';


// Node 6 compatibility.
function entries(x: {[key: string]: any}): Array<[string, any]> {
  return Object.keys(x).reduce((acc: [string, any][], k: string) => {
    const v = x[k];
    acc.push([k, v]);
    return acc;
  }, []);
}


describe('parseJson and parseJsonAst', () => {
  describe('generic', () => {
    const numbers: any = {
    };
    const errors: any = [
      '',
      '-abcdefghijklmnopqrstuvwxyz'
    ];

    for (const [n, [start, end, text]] of entries(numbers)) {
      it(`works for ${JSON.stringify(n)}`, () => {
        const ast = parseJsonAst(n);
        expect(ast.start).toEqual({offset: start[0], line: start[1], character: start[2]});
        expect(ast.end).toEqual({offset: end[0], line: end[1], character: end[2]});
        expect(ast.value).toEqual(JSON.parse(n));
        expect(parseJson(n)).toEqual(JSON.parse(n));
        expect(ast.text).toBe(text === undefined ? n : text);
      });
    }

    for (const n of errors) {
      it(`errors for ${JSON.stringify(n)}`, () => {
        expect(() => parseJsonAst(n)).toThrow();
        expect(() => parseJson(n)).toThrow();
        expect(() => JSON.parse(n)).toThrow();
      });
    }
  });

  describe('numbers', () => {
    const numbers: any = {
      '1234': [[0, 0, 0], [4, 0, 4]],
      '12E34': [[0, 0, 0], [5, 0, 5]],
      '12E+4': [[0, 0, 0], [5, 0, 5]],
      '12E-4': [[0, 0, 0], [5, 0, 5]],
      '12E-0004': [[0, 0, 0], [8, 0, 8]],
      '   1234   ': [[3, 0, 3], [7, 0, 7], '1234'],
      '\r1234\t': [[1, 0, 1], [5, 0, 5], '1234'],
      '\n1234\n': [[1, 1, 0], [5, 1, 4], '1234'],
      '0.123': [[0, 0, 0], [5, 0, 5]],
      '0': [[0, 0, 0], [1, 0, 1]],
      '\n\n\n\n\n0': [[5, 5, 0], [6, 5, 1], '0'],
    };
    const errors: any = [
      '000',
      '01',
      '1E1+1',
      '--',
      '0-0',
      '-0-0',
      '0.0.0',
      '0\n.0\n.0',
    ];

    for (const [n, [start, end, text]] of entries(numbers)) {
      it(`works for ${JSON.stringify(n)}`, () => {
        const ast = parseJsonAst(n);
        expect(ast.kind).toBe('number');
        expect(ast.start).toEqual({offset: start[0], line: start[1], character: start[2]});
        expect(ast.end).toEqual({offset: end[0], line: end[1], character: end[2]});
        expect(ast.value).toEqual(JSON.parse(n));
        expect(parseJson(n)).toEqual(JSON.parse(n));
        expect(ast.text).toBe(text === undefined ? n : text);
      });
    }

    for (const n of errors) {
      it(`errors for ${JSON.stringify(n)}`, () => {
        expect(() => parseJsonAst(n)).toThrow();
        expect(() => parseJson(n)).toThrow();
        expect(() => JSON.parse(n)).toThrow();
      });
    }
  });

  describe('strings', () => {
    const strings: any = {
      '""': [[0, 0, 0], [2, 0, 2]],
      '"hello"': [[0, 0, 0], [7, 0, 7]],
      '"a\\nb"': [[0, 0, 0], [6, 0, 6]],
      '"a\\nb\\tc\\rd\\\\e\\/f\\\"g\\bh\\fi"': [[0, 0, 0], [27, 0, 27]],
      '"a\\u1234b"': [[0, 0, 0], [10, 0, 10]],
    };
    const errors: any = [
      '"\\z"',
      '\'hello\'',
      '"\\',
      '"a\\zb"',
      '"a',
      '"a\nb"',
    ];

    for (const [n, [start, end, text]] of entries(strings)) {
      it(`works for ${JSON.stringify(n)}`, () => {
        const ast = parseJsonAst(n);
        expect(ast.kind).toBe('string');
        expect(ast.start).toEqual({offset: start[0], line: start[1], character: start[2]});
        expect(ast.end).toEqual({offset: end[0], line: end[1], character: end[2]});
        expect(ast.value).toEqual(JSON.parse(n));
        expect(parseJson(n)).toEqual(JSON.parse(n));
        expect(ast.text).toBe(text === undefined ? n : text);
      });
    }

    for (const n of errors) {
      it(`errors for ${JSON.stringify(n)}`, () => {
        expect(() => parseJsonAst(n)).toThrow();
        expect(() => parseJson(n)).toThrow();
        expect(() => JSON.parse(n)).toThrow();
      });
    }
  });

  describe('constants', () => {
    const strings: any = {
      'true': ['true', [0, 0, 0], [4, 0, 4], true],
      'false': ['false', [0, 0, 0], [5, 0, 5], false],
      'null': ['null', [0, 0, 0], [4, 0, 4], null],
    };
    const errors: any = [
      'undefined'
    ];

    for (const [n, [kind, start, end, value, text]] of entries(strings)) {
      it(`works for ${JSON.stringify(n)}`, () => {
        const ast = parseJsonAst(n);
        expect(ast.kind).toBe(kind);
        expect(ast.start).toEqual({offset: start[0], line: start[1], character: start[2]});
        expect(ast.end).toEqual({offset: end[0], line: end[1], character: end[2]});
        expect(ast.value).toEqual(value);
        expect(ast.text).toBe(text === undefined ? n : text);
      });
    }

    for (const n of errors) {
      it(`errors for ${JSON.stringify(n)}`, () => {
        expect(() => parseJsonAst(n)).toThrow();
        expect(() => parseJson(n)).toThrow();
        expect(() => JSON.parse(n)).toThrow();
      });
    }
  });

  describe('arrays', () => {
    const strings: any = {
      '[0,1,2,3]': [[0, 0, 0], [9, 0, 9]],
      '[[0],1,2,3]': [[0, 0, 0], [11, 0, 11]],
      '[0\n,\n1,2,3]': [[0, 0, 0], [11, 2, 6]],
      '[]': [[0, 0, 0], [2, 0, 2]],
      '[\n]': [[0, 0, 0], [3, 1, 1]],
      '[\n\n]': [[0, 0, 0], [4, 2, 1]],
    };
    const errors: any = [
      '[',
      '[,]',
      '[0,]',
      '[,0]',
    ];

    for (const [n, [start, end, text]] of entries(strings)) {
      it(`works for ${JSON.stringify(n)}`, () => {
        const ast = parseJsonAst(n);
        expect(ast.kind).toBe('array');
        expect(ast.start).toEqual({offset: start[0], line: start[1], character: start[2]});
        expect(ast.end).toEqual({offset: end[0], line: end[1], character: end[2]});
        expect(ast.value).toEqual(JSON.parse(n));
        expect(parseJson(n)).toEqual(JSON.parse(n));
        expect(ast.text).toBe(text === undefined ? n : text);
      });
    }

    for (const n of errors) {
      it(`errors for ${JSON.stringify(n)}`, () => {
        expect(() => parseJsonAst(n)).toThrow();
        expect(() => parseJson(n)).toThrow();
        expect(() => JSON.parse(n)).toThrow();
      });
    }
  });

  describe('objects', () => {
    const strings: any = {
      '{}': [[0, 0, 0], [2, 0, 2]],
      '{\n}': [[0, 0, 0], [3, 1, 1]],
      '{"hello": "world"}': [[0, 0, 0], [18, 0, 18]],
      '{"hello": 0, "world": 1}': [[0, 0, 0], [24, 0, 24]],
      '{"hello": {"hello": {"hello": "world"}}}': [[0, 0, 0], [40, 0, 40]],
    };
    const errors: any = [
      '{',
      '{,}',
      '{"hello": 0',
    ];

    for (const [n, [start, end, text]] of entries(strings)) {
      it(`works for ${JSON.stringify(n)}`, () => {
        const ast = parseJsonAst(n);
        expect(ast.kind).toBe('object');
        expect(ast.start).toEqual({offset: start[0], line: start[1], character: start[2]});
        expect(ast.end).toEqual({offset: end[0], line: end[1], character: end[2]});
        expect(ast.value).toEqual(JSON.parse(n));
        expect(parseJson(n)).toEqual(JSON.parse(n));
        expect(ast.text).toBe(text === undefined ? n : text);
      });
    }

    for (const n of errors) {
      it(`errors for ${JSON.stringify(n)}`, () => {
        expect(() => parseJsonAst(n)).toThrow();
        expect(() => parseJson(n)).toThrow();
        expect(() => JSON.parse(n)).toThrow();
      });
    }
  });

  describe('loose', () => {
    const strings: any = {
      '{\'hello\': 0}': [[0, 0, 0], [12, 0, 12], {'hello': 0}],
      '{hello: 0}': [[0, 0, 0], [10, 0, 10], {hello: 0}],
      '{1: 0}': [[0, 0, 0], [6, 0, 6], {1: 0}],
      '{hello\n:/**/ 0}': [[0, 0, 0], [15, 1, 8], {hello: 0}],
      '{\n// hello\n}': [[0, 0, 0], [12, 2, 1], {}],
      '{\n/* hello\n*/ }': [[0, 0, 0], [15, 2, 4], {}],
      '{}//  ': [[0, 0, 0], [2, 0, 2], {}, '{}'],
      '{}//': [[0, 0, 0], [2, 0, 2], {}, '{}'],
    };
    const errors: any = [
      '{1b: 0}',
      ' /*',
      '',
    ];

    for (const [n, [start, end, value, text]] of entries(strings)) {
      it(`works for ${JSON.stringify(n)}`, () => {
        const ast = parseJsonAst(n, JsonParseMode.Loose);
        expect(ast.kind).toBe('object');
        expect(ast.start).toEqual({offset: start[0], line: start[1], character: start[2]});
        expect(ast.end).toEqual({offset: end[0], line: end[1], character: end[2]});
        expect(ast.value).toEqual(value);
        expect(parseJson(n, JsonParseMode.Loose)).toEqual(value);
        expect(ast.text).toBe(text === undefined ? n : text);
      });
    }

    for (const n of errors) {
      it(`errors for ${JSON.stringify(n)}`, () => {
        expect(() => parseJsonAst(n, JsonParseMode.Loose)).toThrow();
        expect(() => parseJson(n, JsonParseMode.Loose)).toThrow();
        expect(() => JSON.parse(n)).toThrow();
      });
    }
  });

  describe('complex', () => {
    it('strips comments', () => {
      expect(parseJson(`
        // THIS IS A COMMENT
        {
          /* THIS IS ALSO A COMMENT */ // IGNORED BECAUSE COMMENT
          // AGAIN, COMMENT /* THIS SHOULD NOT BE WEIRD
          "a": "this // should not be a comment",
          "a2": "this /* should also not be a comment",
          /* MULTIPLE
             LINE
             COMMENT
             \o/ */
          "b" /* COMMENT */: /* YOU GUESSED IT */ 1 // COMMENT
          , /* STILL VALID */
          "c": 2
        }
      `, JsonParseMode.Loose)).toEqual({
        a: 'this // should not be a comment',
        a2: 'this /* should also not be a comment',
        b: 1,
        c: 2
      });
    });
  });
});
