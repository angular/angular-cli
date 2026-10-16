/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import assert from 'node:assert';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadProxyConfiguration } from './load-proxy-config';

describe('loadProxyConfiguration', () => {
  let tempDir: string;

  beforeEach(async () => {
    const baseTmpDir = process.env['TEST_TMPDIR'];
    assert(baseTmpDir, 'TEST_TMPDIR is not set');
    tempDir = await mkdtemp(join(baseTmpDir, 'angular-proxy-config-spec-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  async function createGlobMatcher(glob: string): Promise<(url: string) => boolean> {
    const configPath = join(tempDir, 'proxy.conf.json');
    await writeFile(configPath, JSON.stringify({ [glob]: { target: 'http://localhost:3000' } }));
    const proxy = await loadProxyConfiguration(tempDir, 'proxy.conf.json');
    assert(proxy, 'Expected proxy configuration to be loaded');
    const keys = Object.keys(proxy);
    expect(keys.length).toBe(1);
    const regex = new RegExp(keys[0]);

    return (url: string) => regex.test(url);
  }

  describe('glob to RegExp conversion with query strings', () => {
    it('handles trailing globstar (/**) with and without query strings', async () => {
      const matches = await createGlobMatcher('/search/**');

      expect(matches('/search')).toBeTrue();
      expect(matches('/search?q=angular')).toBeTrue();
      expect(matches('/search/')).toBeTrue();
      expect(matches('/search/?q=angular')).toBeTrue();
      expect(matches('/search/items')).toBeTrue();
      expect(matches('/search/items?q=angular')).toBeTrue();
      expect(matches('/search/items?callback=/.hidden')).toBeTrue();

      expect(matches('/searching')).toBeFalse();
      expect(matches('/searching?q=angular')).toBeFalse();
      expect(matches('/other?redirect=/search')).toBeFalse();
    });

    it('handles single-segment wildcard (*) without matching across slashes or query strings', async () => {
      const matches = await createGlobMatcher('/api/*');

      expect(matches('/api/users')).toBeTrue();
      expect(matches('/api/users?id=1')).toBeTrue();
      expect(matches('/api/users?redirect=/home/page')).toBeTrue();

      expect(matches('/api')).toBeFalse();
      expect(matches('/api/')).toBeFalse();
      expect(matches('/api/?a=1')).toBeFalse();
      expect(matches('/api/users/profile')).toBeFalse();
      expect(matches('/api/users/profile?a=1')).toBeFalse();
    });

    it('handles suffix globs (*.json) without matching query parameters', async () => {
      const matches = await createGlobMatcher('/api/*.json');

      expect(matches('/api/data.json')).toBeTrue();
      expect(matches('/api/data.json?v=1')).toBeTrue();

      expect(matches('/api/users')).toBeFalse();
      expect(matches('/api/users?file=data.json')).toBeFalse();
      expect(matches('/api/.json?v=1')).toBeFalse();
    });

    it('handles middle globstar (/**/) without matching paths in query parameters', async () => {
      const matches = await createGlobMatcher('/api/**/users');

      expect(matches('/api/users')).toBeTrue();
      expect(matches('/api/users?page=1')).toBeTrue();
      expect(matches('/api/v1/users?page=1')).toBeTrue();
      expect(matches('/api/v1/v2/users?page=1')).toBeTrue();

      expect(matches('/api/other?redirect=/users')).toBeFalse();
      expect(matches('/api/users/profile?page=1')).toBeFalse();
    });

    it('handles single-character wildcard (?) without matching the query delimiter', async () => {
      const matches = await createGlobMatcher('/api/v?');

      expect(matches('/api/v1')).toBeTrue();
      expect(matches('/api/v1?a=1')).toBeTrue();

      expect(matches('/api/v')).toBeFalse();
      expect(matches('/api/v?')).toBeFalse();
      expect(matches('/api/v?a=1')).toBeFalse();
      expect(matches('/api/v12?a=1')).toBeFalse();
    });

    it('handles negated globs (!) with and without query strings', async () => {
      const matches = await createGlobMatcher('!/api/public/**');

      expect(matches('/api/public')).toBeFalse();
      expect(matches('/api/public?foo=1')).toBeFalse();
      expect(matches('/api/public/assets?foo=1')).toBeFalse();

      expect(matches('/api/private')).toBeTrue();
      expect(matches('/api/private?foo=1')).toBeTrue();
    });

    it('handles brace expansion and extglobs with query strings', async () => {
      const matchesBraces = await createGlobMatcher('/api/{auth,users}/**');
      expect(matchesBraces('/api/auth?q=1')).toBeTrue();
      expect(matchesBraces('/api/users/list?q=1')).toBeTrue();
      expect(matchesBraces('/api/other?q=1')).toBeFalse();

      const matchesExtglob = await createGlobMatcher('/**/!(*.d).ts');
      expect(matchesExtglob('/app/main.ts')).toBeTrue();
      expect(matchesExtglob('/app/main.ts?extra=.d.ts')).toBeTrue();
      expect(matchesExtglob('/app/main.d.ts')).toBeFalse();
      expect(matchesExtglob('/app/main.d.ts?extra=.ts')).toBeFalse();
    });
  });
});
