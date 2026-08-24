/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { SourceFileCache } from './source-file-cache';

describe('SourceFileCache', () => {
  let cache: SourceFileCache;

  beforeEach(() => {
    cache = new SourceFileCache();
  });

  it('should clean up all caches on clear()', async () => {
    cache.typeScriptFileCache.set('/test/app.component.ts', 'console.log("test");');
    cache.modifiedFiles.add('/test/app.component.ts');
    cache.referencedFiles = ['/test/app.component.ts'];
    await cache.loadResultCache.put('file:/test/app.component.ts', {
      contents: 'test',
      loader: 'js',
    });

    cache.clear();

    expect(cache.typeScriptFileCache.size).toBe(0);
    expect(cache.modifiedFiles.size).toBe(0);
    expect(cache.referencedFiles).toBeUndefined();
    expect(cache.loadResultCache.get('file:/test/app.component.ts')).toBeUndefined();
  });
});
