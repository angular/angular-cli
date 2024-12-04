/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { ServerAssets } from '../src/assets';

describe('ServerAsset', () => {
  let assetManager: ServerAssets;

  beforeAll(() => {
    assetManager = new ServerAssets({
      baseHref: '/',
      bootstrap: undefined as never,
      assets: {
        'index.server.html': {
          text: async () => '<html>Index</html>',
          size: 18,
          hash: 'f799132d0a09e0fef93c68a12e443527700eb59e6f67fcb7854c3a60ff082fde',
        },
        'index.other.html': {
          text: async () => '<html>Other</html>',
          size: 18,
          hash: '4a455a99366921d396f5d51c7253c4678764f5e9487f2c27baaa0f33553c8ce3',
        },
      },
    });
  });

  it('should retrieve and cache the content of index.server.html', async () => {
    const content = await assetManager.getIndexServerHtml().text();
    expect(content).toBe('<html>Index</html>');
  });

  it('should throw an error if the asset path does not exist', () => {
    expect(() => assetManager.getServerAsset('nonexistent.html')).toThrowError(
      "Server asset 'nonexistent.html' does not exist.",
    );
  });

  it('should retrieve the content of index.other.html', async () => {
    const asset = await assetManager.getServerAsset('index.other.html').text();
    expect(asset).toBe('<html>Other</html>');
  });
});
