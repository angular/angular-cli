/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { ServerAssets } from '../src/assets';
import { AngularAppManifest } from '../src/manifest';

describe('ServerAsset', () => {
  let assetManager: ServerAssets;

  beforeAll(() => {
    assetManager = new ServerAssets({
      bootstrap: undefined as never,
      assets: new Map(
        Object.entries({
          'index.server.html': async () => '<html>Index</html>',
          'index.other.html': async () => '<html>Other</html>',
        }),
      ),
    });
  });

  it('should retrieve and cache the content of index.server.html', async () => {
    const content = await assetManager.getIndexServerHtml();
    expect(content).toBe('<html>Index</html>');
  });

  it('should throw an error if the asset path does not exist', async () => {
    await expectAsync(assetManager.getServerAsset('nonexistent.html')).toBeRejectedWithError(
      "Server asset 'nonexistent.html' does not exist.",
    );
  });

  it('should retrieve the content of index.other.html', async () => {
    const content = await assetManager.getServerAsset('index.other.html');
    expect(content).toBe('<html>Other</html>');
  });
});
