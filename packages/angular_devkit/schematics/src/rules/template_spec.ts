/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:no-implicit-dependencies
import { normalize } from '@angular-devkit/core';
import { UnitTestTree } from '@angular-devkit/schematics/testing';
import { of as observableOf } from 'rxjs';
import { SchematicContext } from '../engine/interface';
import { HostTree } from '../tree/host-tree';
import { FileEntry, MergeStrategy } from '../tree/interface';
import { callRule } from './call';
import {
  InvalidPipeException,
  OptionIsNotDefinedException,
  UnknownPipeException,
  applyContentTemplate,
  applyPathTemplate,
  applyTemplates,
} from './template';


function _entry(path?: string, content?: string): FileEntry {
  if (!path) {
    path = 'a/b/c';
  }
  if (!content) {
    content = 'hello world';
  }

  return {
    path: normalize(path),
    content: Buffer.from(content),
  };
}


describe('applyPathTemplate', () => {
  function _applyPathTemplate(path: string, options: {}): string | null {
    const newEntry = applyPathTemplate(options)(_entry(path));
    if (newEntry) {
      return newEntry.path;
    } else {
      return null;
    }
  }

  it('works', () => {
    expect(_applyPathTemplate('/a/b/c/d', {})).toBe('/a/b/c/d');
    expect(_applyPathTemplate('/a/b/__c__/d', { c: 1 })).toBe('/a/b/1/d');
    expect(_applyPathTemplate('/a/b/__c__/d', { c: 'hello/world' })).toBe('/a/b/hello/world/d');
    expect(_applyPathTemplate('/a__c__b', { c: 'hello/world' })).toBe('/ahello/worldb');
    expect(_applyPathTemplate('/a__c__b__d__c', { c: '1', d: '2' })).toBe('/a1b2c');
  });

  it('works with single _', () => {
    expect(_applyPathTemplate('/a_b_c/d__e_f__g', { e_f: 1 })).toBe('/a_b_c/d1g');
  });

  it('works with complex _________...', () => {
    expect(_applyPathTemplate(
      '/_____' + 'a' + '___a__' + '_/' + '__a___/__b___',
      { _a: 0, a: 1, b: 2, _: '.' },
    )).toBe('/.a0_/1_/2_');

    expect(_applyPathTemplate(
      '_____' + '_____' + '_____' + '___',
      { _: '.' },
    )).toBe('...___');
  });

  it('works with functions', () => {
    let arg = '';
    expect(_applyPathTemplate('/a__c__b', {
      c: (x: string) => {
        arg = x;

        return 'hello';
      },
    })).toBe('/ahellob');
    expect(arg).toBe('/a__c__b');
  });

  it('works with pipes', () => {
    let called = '';
    let called2 = '';

    expect(_applyPathTemplate('/a__c@d__b', {
      c: 1,
      d: (x: string) => (called = x, 2),
    })).toBe('/a2b');
    expect(called).toBe('1');

    expect(_applyPathTemplate('/a__c@d@e__b', {
      c: 10,
      d: (x: string) => (called = x, 20),
      e: (x: string) => (called2 = x, 30),
    })).toBe('/a30b');
    expect(called).toBe('10');
    expect(called2).toBe('20');
  });

  it('errors out on undefined values', () => {
    expect(() => _applyPathTemplate('/a__b__c', {})).toThrow(new OptionIsNotDefinedException('b'));
  });

  it('errors out on undefined or invalid pipes', () => {
    expect(() => _applyPathTemplate('/a__b@d__c', { b: 1 })).toThrow(new UnknownPipeException('d'));
    expect(() => _applyPathTemplate('/a__b@d__c', { b: 1, d: 1 }))
      .toThrow(new InvalidPipeException('d'));
  });
});


describe('contentTemplate', () => {
  function _applyContentTemplate(content: string, options: {}) {
    const newEntry = applyContentTemplate(options)(_entry('', content));
    if (newEntry) {
      return newEntry.content.toString('utf-8');
    } else {
      return null;
    }
  }

  it('works with echo token <%= ... %>', () => {
    expect(_applyContentTemplate('a<%= value %>b', { value: 123 })).toBe('a123b');
  });

  it('works with if', () => {
    expect(_applyContentTemplate('a<% if (a) { %>b<% } %>c', {
      value: 123,
      a: true,
    })).toBe('abc');
    expect(_applyContentTemplate('a<% if (a) { %>b<% } %>c', {
      value: 123,
      a: false,
    })).toBe('ac');
  });

  it('works with for', () => {
    expect(_applyContentTemplate('a<% for (let i = 0; i < value; i++) { %>1<% } %>b', {
      value: 5,
    })).toBe('a11111b');
  });

  it('escapes HTML', () => {
    expect(_applyContentTemplate('a<%- html %>b', {
      html: '<script>',
    })).toBe('a&lt;script&gt;b');
  });

  it('escapes strings properly', () => {
    expect(_applyContentTemplate('a<%= value %>b', { value: `'abc'` })).toBe('a\'abc\'b');
    expect(_applyContentTemplate('a<%= \'a\' + "b" %>b', {})).toBe('aabb');
    expect(_applyContentTemplate('a<%= "\\n" + "b" %>b', {})).toBe('a\nbb');
  });
});


describe('applyTemplateFiles', () => {
  it('works with template files exclusively', done => {
    const tree = new UnitTestTree(new HostTree());
    tree.create('a/b/file1', 'hello world');
    tree.create('a/b/file2', 'hello world');
    tree.create('a/b/file3.template', 'hello <%= 1 %> world');
    tree.create('a/b/file__a__.template', 'hello <%= 1 %> world');
    tree.create('a/b/file__norename__', 'hello <%= 1 %> world');
    tree.create('a/c/file4', 'hello world');

    const context: SchematicContext = {
      strategy: MergeStrategy.Default,
    } as SchematicContext;

    // Rename all files that contain 'b' to 'hello'.
    callRule(applyTemplates({ a: 'foo' }), observableOf(tree), context)
      .toPromise()
      .then(() => {
        expect([...tree.files].sort()).toEqual([
          '/a/b/file1',
          '/a/b/file2',
          '/a/b/file3',
          '/a/b/file__norename__',
          '/a/b/filefoo',
          '/a/c/file4',
        ]);

        expect(tree.readContent('/a/b/file3')).toBe('hello 1 world');
      })
      .then(done, done.fail);
  });
});
