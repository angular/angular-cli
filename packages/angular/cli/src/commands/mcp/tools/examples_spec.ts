/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { sanitizeSearchQuery } from './examples';

describe('sanitizeSearchQuery', () => {
  it('should wrap single terms in double quotes', () => {
    expect(sanitizeSearchQuery('foo')).toBe('"foo"');
  });

  it('should wrap multiple terms in double quotes', () => {
    expect(sanitizeSearchQuery('foo bar')).toBe('"foo" "bar"');
  });

  it('should not wrap FTS5 operators', () => {
    expect(sanitizeSearchQuery('foo AND bar')).toBe('"foo" AND "bar"');
    expect(sanitizeSearchQuery('foo OR bar')).toBe('"foo" OR "bar"');
    expect(sanitizeSearchQuery('foo NOT bar')).toBe('"foo" NOT "bar"');
    expect(sanitizeSearchQuery('foo NEAR bar')).toBe('"foo" NEAR "bar"');
  });

  it('should not wrap terms that are already quoted', () => {
    expect(sanitizeSearchQuery('"foo" bar')).toBe('"foo" "bar"');
    expect(sanitizeSearchQuery('"foo bar"')).toBe('"foo bar"');
  });

  it('should handle prefix searches', () => {
    expect(sanitizeSearchQuery('foo*')).toBe('"foo"*');
    expect(sanitizeSearchQuery('foo* bar')).toBe('"foo"* "bar"');
  });

  it('should handle multi-word quoted phrases', () => {
    expect(sanitizeSearchQuery('"foo bar" baz')).toBe('"foo bar" "baz"');
    expect(sanitizeSearchQuery('foo "bar baz"')).toBe('"foo" "bar baz"');
  });

  it('should handle complex queries', () => {
    expect(sanitizeSearchQuery('("foo bar" OR baz) AND qux*')).toBe(
      '("foo bar" OR "baz") AND "qux"*',
    );
  });

  it('should handle multi-word quoted phrases with three or more words', () => {
    expect(sanitizeSearchQuery('"foo bar baz" qux')).toBe('"foo bar baz" "qux"');
    expect(sanitizeSearchQuery('foo "bar baz qux"')).toBe('"foo" "bar baz qux"');
    expect(sanitizeSearchQuery('foo "bar baz qux" quux')).toBe('"foo" "bar baz qux" "quux"');
  });
});
