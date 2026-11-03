/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { FatalLinkerError } from '@angular/compiler-cli/linker';
import { parseSync } from 'oxc-parser';
import { OxcAstHost } from './oxc-ast-host';

describe('OxcAstHost', () => {
  let host: OxcAstHost;

  beforeEach(() => {
    host = new OxcAstHost();
  });

  function parseExpression(code: string): unknown {
    const { program } = parseSync('test.js', `const x = ${code};`, { range: true });
    const stmt = program.body[0] as { declarations: Array<{ init: unknown }> };

    return stmt.declarations[0].init;
  }

  function parseStatement(code: string): unknown {
    const { program } = parseSync('test.js', code, { range: true });

    return program.body[0];
  }

  describe('getSymbolName', () => {
    it('should return the name of an identifier', () => {
      const expr = parseExpression('foo');
      expect(host.getSymbolName(expr)).toBe('foo');
      expect(host.getSymbolName(parseExpression('(foo)'))).toBe('foo');
    });

    it('should return the property name of a member expression', () => {
      const expr = parseExpression('foo.bar');
      expect(host.getSymbolName(expr)).toBe('bar');
      expect(host.getSymbolName(parseExpression('(foo.bar)'))).toBe('bar');
    });

    it('should return null for non-identifier or computed member expressions', () => {
      expect(host.getSymbolName(parseExpression('foo[0]'))).toBeNull();
      expect(host.getSymbolName(parseExpression('42'))).toBeNull();
      expect(host.getSymbolName(null)).toBeNull();
    });
  });

  describe('string literals', () => {
    it('should recognize and parse valid string literals', () => {
      const expr = parseExpression('"hello"');
      expect(host.isStringLiteral(expr)).toBe(true);
      expect(host.parseStringLiteral(expr)).toBe('hello');

      const parenthesized = parseExpression('("hello")');
      expect(host.isStringLiteral(parenthesized)).toBe(true);
      expect(host.parseStringLiteral(parenthesized)).toBe('hello');
    });

    it('should throw when parsing non-string literals', () => {
      const expr = parseExpression('123');
      expect(host.isStringLiteral(expr)).toBe(false);
      expect(() => host.parseStringLiteral(expr)).toThrowError(FatalLinkerError);
    });
  });

  describe('numeric literals', () => {
    it('should recognize and parse valid numeric literals', () => {
      const expr = parseExpression('123');
      expect(host.isNumericLiteral(expr)).toBe(true);
      expect(host.parseNumericLiteral(expr)).toBe(123);

      const parenthesized = parseExpression('(123)');
      expect(host.isNumericLiteral(parenthesized)).toBe(true);
      expect(host.parseNumericLiteral(parenthesized)).toBe(123);
    });

    it('should throw when parsing non-numeric literals', () => {
      const expr = parseExpression('"123"');
      expect(host.isNumericLiteral(expr)).toBe(false);
      expect(() => host.parseNumericLiteral(expr)).toThrowError(FatalLinkerError);
    });
  });

  describe('boolean literals', () => {
    it('should recognize and parse true and false literals', () => {
      const trueExpr = parseExpression('true');
      const falseExpr = parseExpression('false');
      expect(host.isBooleanLiteral(trueExpr)).toBe(true);
      expect(host.parseBooleanLiteral(trueExpr)).toBe(true);
      expect(host.isBooleanLiteral(falseExpr)).toBe(true);
      expect(host.parseBooleanLiteral(falseExpr)).toBe(false);

      const parenthesizedTrue = parseExpression('(true)');
      expect(host.isBooleanLiteral(parenthesizedTrue)).toBe(true);
      expect(host.parseBooleanLiteral(parenthesizedTrue)).toBe(true);
    });

    it('should recognize and parse minified boolean literals (!0 and !1)', () => {
      const trueExpr = parseExpression('!0');
      const falseExpr = parseExpression('!1');
      expect(host.isBooleanLiteral(trueExpr)).toBe(true);
      expect(host.parseBooleanLiteral(trueExpr)).toBe(true);
      expect(host.isBooleanLiteral(falseExpr)).toBe(true);
      expect(host.parseBooleanLiteral(falseExpr)).toBe(false);

      const parenthesizedMinified = parseExpression('(!0)');
      expect(host.isBooleanLiteral(parenthesizedMinified)).toBe(true);
      expect(host.parseBooleanLiteral(parenthesizedMinified)).toBe(true);
    });

    it('should return false for invalid boolean expressions', () => {
      expect(host.isBooleanLiteral(parseExpression('!2'))).toBe(false);
      expect(() => host.parseBooleanLiteral(parseExpression('!2'))).toThrowError(FatalLinkerError);
    });
  });

  describe('array literals', () => {
    it('should recognize and parse array literals', () => {
      const expr = parseExpression('[1, "a", true]');
      expect(host.isArrayLiteral(expr)).toBe(true);
      expect(host.parseArrayLiteral(expr).length).toBe(3);

      const parenthesized = parseExpression('([1, "a", true])');
      expect(host.isArrayLiteral(parenthesized)).toBe(true);
      expect(host.parseArrayLiteral(parenthesized).length).toBe(3);
    });

    it('should unwrap parenthesized elements in array literals', () => {
      const expr = parseExpression('[(1), ("a")]');
      const elements = host.parseArrayLiteral(expr);
      expect(elements.length).toBe(2);
      expect(host.isNumericLiteral(elements[0])).toBe(true);
      expect(host.isStringLiteral(elements[1])).toBe(true);
    });

    it('should throw when array contains empty elements or spread syntax', () => {
      expect(() => host.parseArrayLiteral(parseExpression('[1, , 2]'))).toThrowError(
        FatalLinkerError,
      );
      expect(() => host.parseArrayLiteral(parseExpression('[1, ...a]'))).toThrowError(
        FatalLinkerError,
      );
      expect(() => host.parseArrayLiteral(parseExpression('[1, ...(a)]'))).toThrowError(
        FatalLinkerError,
      );
    });
  });

  describe('object literals', () => {
    it('should recognize and parse object literals into a Map', () => {
      const expr = parseExpression('{ a: 1, "b": 2, 3: "c" }');
      expect(host.isObjectLiteral(expr)).toBe(true);

      const map = host.parseObjectLiteral(expr);
      expect(map.size).toBe(3);
      expect(map.has('a')).toBe(true);
      expect(map.has('b')).toBe(true);
      expect(map.has('3')).toBe(true);
    });

    it('should recognize and parse parenthesized object literals', () => {
      const expr = parseExpression('({ a: (1), b: ("c") })');
      expect(host.isObjectLiteral(expr)).toBe(true);

      const map = host.parseObjectLiteral(expr);
      expect(map.size).toBe(2);
      expect(host.isNumericLiteral(map.get('a'))).toBe(true);
      expect(host.isStringLiteral(map.get('b'))).toBe(true);
    });

    it('should throw when object literal contains spread or non-property assignments', () => {
      expect(() => host.parseObjectLiteral(parseExpression('{ ...a }'))).toThrowError(
        FatalLinkerError,
      );
    });
  });

  describe('functions', () => {
    it('should parse return value and parameters from arrow functions', () => {
      const expr = parseExpression('(a, b) => 42');
      expect(host.isFunctionExpression(expr)).toBe(true);
      expect(host.parseParameters(expr).length).toBe(2);

      const returnValue = host.parseReturnValue(expr);
      expect(host.isNumericLiteral(returnValue)).toBe(true);
    });

    it('should parse parenthesized arrow functions and concise bodies returning parenthesized object literals', () => {
      const expr = parseExpression('() => ({ a: 1 })');
      expect(host.isFunctionExpression(expr)).toBe(true);

      const returnValue = host.parseReturnValue(expr);
      expect(host.isObjectLiteral(returnValue)).toBe(true);
      const map = host.parseObjectLiteral(returnValue);
      expect(map.has('a')).toBe(true);

      const wrappedArrow = parseExpression('((a) => (42))');
      expect(host.isFunctionExpression(wrappedArrow)).toBe(true);
      expect(host.parseParameters(wrappedArrow).length).toBe(1);
      expect(host.isNumericLiteral(host.parseReturnValue(wrappedArrow))).toBe(true);
    });

    it('should parse return value from function with block statement containing single return', () => {
      const stmt = parseStatement('function foo(a) { return "hello"; }');
      expect(host.isFunctionExpression(stmt)).toBe(true);

      const returnValue = host.parseReturnValue(stmt);
      expect(host.isStringLiteral(returnValue)).toBe(true);
    });

    it('should parse return value from function returning parenthesized expression', () => {
      const stmt = parseStatement('function foo() { return ({ a: 1 }); }');
      expect(host.isFunctionExpression(stmt)).toBe(true);

      const returnValue = host.parseReturnValue(stmt);
      expect(host.isObjectLiteral(returnValue)).toBe(true);
    });

    it('should throw when function body has multiple statements or no return', () => {
      expect(() =>
        host.parseReturnValue(parseStatement('function foo() { const x = 1; return x; }')),
      ).toThrowError(FatalLinkerError);
      expect(() => host.parseReturnValue(parseStatement('function foo() {}'))).toThrowError(
        FatalLinkerError,
      );
    });
  });

  describe('call expressions', () => {
    it('should parse callee and arguments', () => {
      const expr = parseExpression('foo(1, "a")');
      expect(host.isCallExpression(expr)).toBe(true);
      expect(host.getSymbolName(host.parseCallee(expr))).toBe('foo');
      expect(host.parseArguments(expr).length).toBe(2);

      const parenthesized = parseExpression('((foo)((1), ("a")))');
      expect(host.isCallExpression(parenthesized)).toBe(true);
      expect(host.getSymbolName(host.parseCallee(parenthesized))).toBe('foo');
      const args = host.parseArguments(parenthesized);
      expect(args.length).toBe(2);
      expect(host.isNumericLiteral(args[0])).toBe(true);
      expect(host.isStringLiteral(args[1])).toBe(true);
    });

    it('should throw when call expression arguments contain spread syntax', () => {
      expect(() => host.parseArguments(parseExpression('foo(...args)'))).toThrowError(
        FatalLinkerError,
      );
    });
  });

  describe('getRange', () => {
    it('should return range object for valid AST nodes', () => {
      const expr = parseExpression('foo');
      const range = host.getRange(expr);
      expect(range.startPos).toBeGreaterThanOrEqual(0);
      expect(range.endPos).toBeGreaterThan(range.startPos);
    });

    it('should throw when node is missing range offsets', () => {
      expect(() => host.getRange({})).toThrowError(FatalLinkerError);
    });
  });
});
