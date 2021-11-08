/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { promises } from 'fs';
import { AbortablePromise, FetchOptions, ResourceLoader } from 'jsdom';
import { normalize } from 'path';

export class CustomResourceLoader extends ResourceLoader {
  constructor(
    private readonly baseUrl: string,
    private readonly publicPath: string,
    private readonly fileCache: Map<string, Buffer>,
  ) {
    super();
  }

  fetch(url: string, _options: FetchOptions): AbortablePromise<Buffer> | null {
    if (!url.endsWith('.js') || !url.startsWith(this.baseUrl)) {
      return null;
    }

    const path = normalize(url.replace(this.baseUrl, this.publicPath));
    if (this.fileCache.has(path)) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const filePromise = Promise.resolve(this.fileCache.get(path)!) as AbortablePromise<Buffer>;
      filePromise.abort = () => undefined;

      return filePromise;
    }

    const promise = promises.readFile(path, 'utf-8').then((content) => {
      if (path.includes('runtime.')) {
        // JSDOM doesn't support type=module, which will be added to lazy loaded scripts.
        // https://github.com/jsdom/jsdom/issues/2475
        content = content.replace(/\.type\s?=\s?['"]module["']/, '');
      }

      this.fileCache.set(path, Buffer.from(content));

      return content;
    }) as AbortablePromise<Buffer>;

    promise.abort = () => undefined;

    return promise;
  }
}
