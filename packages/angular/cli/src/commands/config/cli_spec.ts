/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { parseJsonPath } from './cli';

describe('parseJsonPath', () => {
  it('should parse single digit array indices', () => {
    expect(parseJsonPath('a[3].foo.bar[2]')).toEqual(['a', 3, 'foo', 'bar', 2]);
  });

  it('should parse multi digit array indices', () => {
    expect(parseJsonPath('projects.app.architect.build.options.styles[10]')).toEqual([
      'projects',
      'app',
      'architect',
      'build',
      'options',
      'styles',
      10,
    ]);
    expect(parseJsonPath('a[2][13].b')).toEqual(['a', 2, 13, 'b']);
  });

  it('should keep quoted keys as strings', () => {
    expect(parseJsonPath('projects["test-project"].root')).toEqual([
      'projects',
      'test-project',
      'root',
    ]);
    expect(parseJsonPath(`a['10']`)).toEqual(['a', '10']);
  });
});
