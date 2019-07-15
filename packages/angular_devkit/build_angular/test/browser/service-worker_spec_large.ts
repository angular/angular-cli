/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Architect } from '@angular-devkit/architect';
import { normalize, virtualFs } from '@angular-devkit/core';
import { createArchitect, host } from '../utils';

describe('Browser Builder service worker', () => {
  const manifest = {
    index: '/index.html',
    assetGroups: [
      {
        name: 'app',
        installMode: 'prefetch',
        resources: {
          files: [
            '/favicon.ico',
            '/index.html',
            '/*.bundle.css',
            '/*.bundle.js',
            '/*.chunk.js',
          ],
        },
      },
      {
        name: 'assets',
        installMode: 'lazy',
        updateMode: 'prefetch',
        resources: {
          files: [
            '/assets/**',
            '/*.(eot|svg|cur|jpg|png|webp|gif|otf|ttf|woff|woff2|ani)',
          ],
        },
      },
    ],
  };

  const target = { project: 'app', target: 'build' };
  let architect: Architect;

  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;
  });
  afterEach(async () => host.restore().toPromise());

  it('errors if no ngsw-config.json is present', async () => {
    const overrides = { serviceWorker: true };

    const run = await architect.scheduleTarget(target, overrides);

    await expectAsync(run.result).toBeResolvedTo(jasmine.objectContaining({ success: false }));

    await run.stop();
  });

  it('works with service worker', async () => {
    host.writeMultipleFiles({
      'src/ngsw-config.json': JSON.stringify(manifest),
      'src/assets/folder-asset.txt': 'folder-asset.txt',
      'src/styles.css': `body { background: url(./spectrum.png); }`,
    });

    const overrides = { serviceWorker: true };
    const run = await architect.scheduleTarget(target, overrides);

    await expectAsync(run.result).toBeResolvedTo(jasmine.objectContaining({ success: true }));

    expect(host.scopedSync().exists(normalize('dist/ngsw.json')));
    const ngswJson = JSON.parse(virtualFs.fileBufferToString(
      host.scopedSync().read(normalize('dist/ngsw.json'))));
    // Verify index and assets are there.
    expect(ngswJson).toEqual(jasmine.objectContaining({
      configVersion: 1,
      index: '/index.html',
      navigationUrls: [
        { positive: true, regex: '^\\\/.*$' },
        { positive: false, regex: '^\\\/(?:.+\\\/)?[^\/]*\\.[^\/]*$' },
        { positive: false, regex: '^\\\/(?:.+\\\/)?[^\/]*__[^\/]*$' },
        { positive: false, regex: '^\\\/(?:.+\\\/)?[^\/]*__[^\/]*\\\/.*$' },
      ],
      assetGroups: [
        {
          name: 'app',
          installMode: 'prefetch',
          updateMode: 'prefetch',
          urls: [
            '/favicon.ico',
            '/index.html',
          ],
          patterns: [],
        },
        {
          name: 'assets',
          installMode: 'lazy',
          updateMode: 'prefetch',
          urls: [
            '/assets/folder-asset.txt',
            '/spectrum.png',
          ],
          patterns: [],
        },
      ],
      dataGroups: [],
      hashTable: {
        '/favicon.ico': '84161b857f5c547e3699ddfbffc6d8d737542e01',
        '/assets/folder-asset.txt': '617f202968a6a81050aa617c2e28e1dca11ce8d4',
        '/index.html': 'f95e7a84949070c4984069b592be7969bc3187a0',
        '/spectrum.png': '8d048ece46c0f3af4b598a95fd8e4709b631c3c0',
      },
    }));

    await run.stop();
  });

  it('works with service worker and baseHref', async () => {
    host.writeMultipleFiles({
      'src/ngsw-config.json': JSON.stringify(manifest),
      'src/assets/folder-asset.txt': 'folder-asset.txt',
    });

    const overrides = { serviceWorker: true, baseHref: '/foo/bar' };
    const run = await architect.scheduleTarget(target, overrides);

    await expectAsync(run.result).toBeResolvedTo(jasmine.objectContaining({ success: true }));

    expect(host.scopedSync().exists(normalize('dist/ngsw.json')));
    const ngswJson = JSON.parse(virtualFs.fileBufferToString(
      host.scopedSync().read(normalize('dist/ngsw.json'))));
    // Verify index and assets include the base href.
    expect(ngswJson).toEqual(jasmine.objectContaining({
      configVersion: 1,
      index: '/foo/bar/index.html',
      navigationUrls: [
        { positive: true, regex: '^\\\/.*$' },
        { positive: false, regex: '^\\\/(?:.+\\\/)?[^\/]*\\.[^\/]*$' },
        { positive: false, regex: '^\\\/(?:.+\\\/)?[^\/]*__[^\/]*$' },
        { positive: false, regex: '^\\\/(?:.+\\\/)?[^\/]*__[^\/]*\\\/.*$' },
      ],
      assetGroups: [
        {
          name: 'app',
          installMode: 'prefetch',
          updateMode: 'prefetch',
          urls: [
            '/foo/bar/favicon.ico',
            '/foo/bar/index.html',
          ],
          patterns: [],
        },
        {
          name: 'assets',
          installMode: 'lazy',
          updateMode: 'prefetch',
          urls: [
            '/foo/bar/assets/folder-asset.txt',
          ],
          patterns: [],
        },
      ],
      dataGroups: [],
      hashTable: {
        '/foo/bar/favicon.ico': '84161b857f5c547e3699ddfbffc6d8d737542e01',
        '/foo/bar/assets/folder-asset.txt': '617f202968a6a81050aa617c2e28e1dca11ce8d4',
        '/foo/bar/index.html': 'a5359e8e1a516683b32bbb2f9e8bf402dae4738e',
      },
    }));

    await run.stop();
  });
});
