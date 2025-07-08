/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { escapeSearchQuery } from './examples';

describe('escapeSearchQuery', () => {
  it('should wrap single terms in double quotes', () => {
    expect(escapeSearchQuery('foo')).toBe('"foo"');
  });

  it('should wrap multiple terms in double quotes', () => {
    expect(escapeSearchQuery('foo bar')).toBe('"foo" "bar"');
  });

  it('should not wrap FTS5 operators', () => {
    expect(escapeSearchQuery('foo AND bar')).toBe('"foo" AND "bar"');
    expect(escapeSearchQuery('foo OR bar')).toBe('"foo" OR "bar"');
    expect(escapeSearchQuery('foo NOT bar')).toBe('"foo" NOT "bar"');
    expect(escapeSearchQuery('foo NEAR bar')).toBe('"foo" NEAR "bar"');
  });

  it('should not wrap terms that are already quoted', () => {
    expect(escapeSearchQuery('"foo" bar')).toBe('"foo" "bar"');
    expect(escapeSearchQuery('"foo bar"')).toBe('"foo bar"');
  });

  it('should handle prefix searches', () => {
    expect(escapeSearchQuery('foo*')).toBe('"foo"*');
    expect(escapeSearchQuery('foo* bar')).toBe('"foo"* "bar"');
  });

  it('should handle multi-word quoted phrases', () => {
    expect(escapeSearchQuery('"foo bar" baz')).toBe('"foo bar" "baz"');
    expect(escapeSearchQuery('foo "bar baz"')).toBe('"foo" "bar baz"');
  });

  it('should handle complex queries', () => {
    expect(escapeSearchQuery('("foo bar" OR baz) AND qux*')).toBe(
      '("foo bar" OR "baz") AND "qux"*',
    );
  });

  it('should handle multi-word quoted phrases with three or more words', () => {
    expect(escapeSearchQuery('"foo bar baz" qux')).toBe('"foo bar baz" "qux"');
    expect(escapeSearchQuery('foo "bar baz qux"')).toBe('"foo" "bar baz qux"');
    expect(escapeSearchQuery('foo "bar baz qux" quux')).toBe('"foo" "bar baz qux" "quux"');
  });
});
