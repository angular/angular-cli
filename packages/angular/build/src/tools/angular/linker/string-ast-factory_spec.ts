/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { StringAstFactory } from './string-ast-factory';

describe('StringAstFactory', () => {
  let factory: StringAstFactory;

  beforeEach(() => {
    factory = new StringAstFactory('const foo = bar;');
  });

  describe('source slicing (render)', () => {
    it('should slice original source code when given an AST object with start and end offsets', () => {
      const astNode = { start: 6, end: 9 };
      expect(factory.createExpressionStatement(astNode)).toBe('foo;');
    });
  });

  describe('literals and identifiers', () => {
    it('should correctly format string literals', () => {
      expect(factory.createLiteral('hello')).toBe('"hello"');
    });

    it('should correctly format numeric literals including NaN and Infinity', () => {
      expect(factory.createLiteral(123)).toBe('123');
      expect(factory.createLiteral(NaN)).toBe('NaN');
      expect(factory.createLiteral(Infinity)).toBe('Infinity');
    });

    it('should correctly format boolean literals', () => {
      expect(factory.createLiteral(true)).toBe('true');
      expect(factory.createLiteral(false)).toBe('false');
    });

    it('should correctly format null and undefined literals', () => {
      expect(factory.createLiteral(null)).toBe('null');
      expect(factory.createLiteral(undefined)).toBe('undefined');
    });

    it('should correctly create identifiers', () => {
      expect(factory.createIdentifier('myVar')).toBe('myVar');
    });

    it('should correctly format regular expression literals', () => {
      expect(factory.createRegularExpressionLiteral('abc+', 'g')).toBe('/abc+/g');
      expect(factory.createRegularExpressionLiteral('abc+', null)).toBe('/abc+/');
    });
  });

  describe('array and object literals', () => {
    it('should correctly format array literals', () => {
      expect(factory.createArrayLiteral(['1', '2', '3'])).toBe('[1, 2, 3]');
    });

    it('should correctly format object literals with quoted and unquoted keys', () => {
      const props = [
        { kind: 'property' as const, propertyName: 'foo', value: '1', quoted: false },
        { kind: 'property' as const, propertyName: 'foo-bar', value: '2', quoted: true },
      ];
      expect(factory.createObjectLiteral(props)).toContain('{\nfoo: 1,\n"foo-bar": 2\n}');
    });

    it('should correctly format object literals with spread properties', () => {
      const props = [
        { kind: 'property' as const, propertyName: 'foo', value: '1', quoted: false },
        { kind: 'spread' as const, expression: 'bar' },
      ];
      expect(factory.createObjectLiteral(props)).toContain('{\nfoo: 1,\n...bar\n}');
    });
  });

  describe('property and element access', () => {
    it('should correctly format property access and property access chains', () => {
      expect(factory.createPropertyAccess('foo', 'bar')).toBe('foo.bar');
      expect(factory.createPropertyAccessChain('foo', 'bar', true)).toBe('foo?.bar');
      expect(factory.createPropertyAccessChain('foo', 'bar', false)).toBe('foo.bar');
    });

    it('should correctly format element access and element access chains', () => {
      expect(factory.createElementAccess('foo', '"bar"')).toBe('foo["bar"]');
      expect(factory.createElementAccessChain('foo', '"bar"', true)).toBe('foo?.["bar"]');
      expect(factory.createElementAccessChain('foo', '"bar"', false)).toBe('foo["bar"]');
    });

    it('should parenthesize precedence-sensitive receivers in property and element access', () => {
      expect(factory.createPropertyAccess('() => {}', 'bar')).toBe('(() => {}).bar');
      expect(factory.createPropertyAccess('5', 'bar')).toBe('(5).bar');
      expect(factory.createPropertyAccess('typeof x', 'bar')).toBe('(typeof x).bar');
      expect(factory.createElementAccess('() => {}', '"bar"')).toBe('(() => {})["bar"]');
    });
  });

  describe('call expressions and chains', () => {
    it('should format standard and pure call expressions', () => {
      expect(factory.createCallExpression('foo', ['1', '2'], false)).toBe('foo(1, 2)');
      expect(factory.createCallExpression('foo', ['1', '2'], true)).toBe('/*@__PURE__*/ foo(1, 2)');
    });

    it('should wrap arrow functions and function expressions in parentheses when used as callees', () => {
      expect(factory.createCallExpression('() => {}', [], false)).toBe('(() => {})()');
      expect(factory.createCallExpression('function() {}', [], false)).toBe('(function() {})()');
      expect(factory.createCallChain('() => {}', [], false, true)).toBe('(() => {})?.()');
      expect(factory.createNewExpression('() => Foo', [])).toBe('new (() => Foo)()');
    });

    it('should format optional call chains', () => {
      expect(factory.createCallChain('foo', ['1'], false, true)).toBe('foo?.(1)');
      expect(factory.createCallChain('foo', ['1'], false, false)).toBe('foo(1)');
    });

    it('should format new expressions', () => {
      expect(factory.createNewExpression('Foo', ['1', '2'])).toBe('new Foo(1, 2)');
    });
  });

  describe('operators and expressions', () => {
    it('should format binary and assignment expressions with parentheses', () => {
      expect(factory.createBinaryExpression('a', '+', 'b')).toBe('(a + b)');
      expect(factory.createBinaryExpression('a + b', '*', 'c + d')).toBe('((a + b) * (c + d))');
      expect(factory.createAssignment('a', '=', 'b')).toBe('(a = b)');
    });

    it('should format conditional expressions with parentheses', () => {
      expect(factory.createConditional('cond', 'trueVal', 'falseVal')).toBe(
        '(cond ? trueVal : falseVal)',
      );
    });

    it('should format unary expressions', () => {
      expect(factory.createUnaryExpression('!', 'foo')).toBe('!foo');
      expect(factory.createTypeOfExpression('foo')).toBe('typeof foo');
      expect(factory.createVoidExpression('foo')).toBe('void foo');
      expect(factory.createUnaryExpression('!', 'a + b')).toBe('!(a + b)');
    });
  });

  describe('functions and statements', () => {
    it('should format function declarations and expressions', () => {
      const params = [
        { name: 'a', type: null },
        { name: 'b', type: null },
      ];
      expect(factory.createFunctionDeclaration('foo', params, '{ return a + b; }')).toBe(
        'function foo(a, b) { return a + b; }',
      );
      expect(factory.createFunctionExpression('foo', params, '{ return a + b; }')).toBe(
        'function foo(a, b) { return a + b; }',
      );
      expect(factory.createFunctionExpression(null, params, '{ return a + b; }')).toBe(
        'function(a, b) { return a + b; }',
      );
    });

    it('should format arrow functions', () => {
      const params = [
        { name: 'a', type: null },
        { name: 'b', type: null },
      ];
      expect(factory.createArrowFunctionExpression(params, 'a + b')).toBe('(a, b) => a + b');
    });

    it('should parenthesize object literal expression bodies in arrow functions even when containing semicolons', () => {
      const params = [{ name: 'a', type: null }];
      const obj = factory.createObjectLiteral([
        {
          kind: 'property',
          propertyName: 'factory',
          value: '() => { return new Service(); }',
          quoted: false,
        },
      ]);
      expect(factory.createArrowFunctionExpression(params, obj)).toBe(
        '(a) => ({\nfactory: () => { return new Service(); }\n})',
      );
    });

    it('should format statements', () => {
      expect(factory.createBlock(['foo();', 'bar();'])).toBe('{\nfoo();\nbar();\n}');
      expect(factory.createIfStatement('cond', 'foo();', 'bar();')).toBe(
        'if (cond) foo(); else bar();',
      );
      expect(factory.createIfStatement('cond', 'foo();', null)).toBe('if (cond) foo();');
      expect(factory.createReturnStatement('val')).toBe('return val;');
      expect(factory.createReturnStatement(null)).toBe('return;');
      expect(factory.createThrowStatement('err')).toBe('throw err;');
      expect(factory.createVariableDeclaration('x', '1', 'const')).toBe('const x = 1;');
      expect(factory.createVariableDeclaration('y', null, 'let')).toBe('let y;');
    });
  });

  describe('template literals', () => {
    it('should format template literals and tagged templates', () => {
      const template = {
        elements: [
          { raw: 'Hello ', cooked: 'Hello ', range: null },
          { raw: '!', cooked: '!', range: null },
        ],
        expressions: ['name'],
      };
      expect(factory.createTemplateLiteral(template)).toBe('`Hello ${name}!`');
      expect(factory.createTaggedTemplate('tag', template)).toBe('tag`Hello ${name}!`');
    });
  });
});
