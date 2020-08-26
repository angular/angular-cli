/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { urlJoin } from './url';

describe('urlJoin', () => {
  it('should work with absolute url with trailing slash', () => {
    expect(urlJoin('http://foo.com/', '/one/')).toBe('http://foo.com/one/');
  });

  it('should work with absolute url without trailing slash', () => {
    expect(urlJoin('http://foo.com', '/one')).toBe('http://foo.com/one');
  });

  it('should work with absolute url without slashes', () => {
    expect(urlJoin('http://foo.com', 'one', 'two')).toBe('http://foo.com/one/two');
  });

  it('should work with relative url without slashes', () => {
    expect(urlJoin('one', 'two', 'three')).toBe('one/two/three');
  });

  it('should keep trailing slash if empty path is provided', () => {
    expect(urlJoin('one/', '')).toBe('one/');
  });
});
