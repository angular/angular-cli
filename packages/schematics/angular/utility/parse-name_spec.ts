/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { parseName } from './parse-name';


describe('parse-name', () => {
  it('should handle just the name', () => {
    const result = parseName('src/app', 'foo');
    expect(result.name).toEqual('foo');
    expect(result.path).toEqual('/src/app');
  });

  it('should handle no path', () => {
    const result = parseName('', 'foo');
    expect(result.name).toEqual('foo');
    expect(result.path).toEqual('/');
  });

  it('should handle name has a path (sub-dir)', () => {
    const result = parseName('src/app', 'bar/foo');
    expect(result.name).toEqual('foo');
    expect(result.path).toEqual('/src/app/bar');
  });

  it('should handle name has a higher path', () => {
    const result = parseName('src/app', '../foo');
    expect(result.name).toEqual('foo');
    expect(result.path).toEqual('/src');
  });

  it('should handle name has a higher path above root', () => {
    expect(() => parseName('src/app', '../../../foo')).toThrow();
  });
});
