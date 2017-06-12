/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {
  applyContentTemplate,
  applyPathTemplate,
  InvalidPipeException,
  OptionIsNotDefinedException,
  UnknownPipeException
} from './template';


describe('applyPathTemplate', () => {
  it('works', () => {
    expect(applyPathTemplate('a/b/c/d', {})).toBe('a/b/c/d');
    expect(applyPathTemplate('a/b/__c__/d', { c: 1 })).toBe('a/b/1/d');
    expect(applyPathTemplate('a/b/__c__/d', { c: 'hello/world' })).toBe('a/b/hello/world/d');
    expect(applyPathTemplate('a__c__b', { c: 'hello/world' })).toBe('ahello/worldb');
    expect(applyPathTemplate('a__c__b__d__c', { c: '1', d: '2' })).toBe('a1b2c');
  });

  it('works with functions', () => {
    let arg = '';
    expect(applyPathTemplate('a__c__b', {
      c: (x: string) => {
        arg = x;
        return 'hello';
      }
    })).toBe('ahellob');
    expect(arg).toBe('a__c__b');
  });

  it('works with pipes', () => {
    let called = '';
    let called2 = '';

    expect(applyPathTemplate('a__c@d__b', {
      c: 1,
      d: (x: string) => {
        called = x;
        return 2;
      }
    })).toBe('a2b');
    expect(called).toBe('1');

    expect(applyPathTemplate('a__c@d@e__b', {
      c: 10,
      d: (x: string) => {
        called = x;
        return 20;
      },
      e: (x: string) => {
        called2 = x;
        return 30;
      }
    })).toBe('a30b');
    expect(called).toBe('10');
    expect(called2).toBe('20');
  });

  it('errors out on undefined values', () => {
    expect(() => applyPathTemplate('a__b__c', {})).toThrow(new OptionIsNotDefinedException('b'));
  });

  it('errors out on undefined or invalid pipes', () => {
    expect(() => applyPathTemplate('a__b@d__c', { b: 1 })).toThrow(new UnknownPipeException('d'));
    expect(() => applyPathTemplate('a__b@d__c', { b: 1, d: 1 }))
      .toThrow(new InvalidPipeException('d'));
  });
});



describe('contentTemplate', () => {
  it('works with echo token <%= ... %>', () => {
    expect(applyContentTemplate('a<%= value %>b', { value: 123 })).toBe('a123b');
  });

  it('works with if', () => {
    expect(applyContentTemplate('a<% if (a) { %>b<% } %>c', {
      value: 123,
      a: true
    })).toBe('abc');
    expect(applyContentTemplate('a<% if (a) { %>b<% } %>c', {
      value: 123,
      a: false
    })).toBe('ac');
  });

  it('works with for', () => {
    expect(applyContentTemplate('a<% for (let i = 0; i < value; i++) { %>1<% } %>b', {
      value: 5
    })).toBe('a11111b');
  });

  it('escapes HTML', () => {
    expect(applyContentTemplate('a<%- html %>b', {
      html: '<script>'
    })).toBe('a&lt;script&gt;b');
  });

  it('escapes strings properly', () => {
    expect(applyContentTemplate('a<%= value %>b', { value: `'abc'` })).toBe('a\'abc\'b');
    expect(applyContentTemplate('a<%= \'a\' + "b" %>b', {})).toBe('aabb');
    expect(applyContentTemplate('a<%= "\\n" + "b" %>b', {})).toBe('a\nbb');
  });
});
