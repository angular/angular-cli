/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

const MIMALLOC_PURGE_DELAY = 'MIMALLOC_PURGE_DELAY';

describe('loadRolldown', () => {
  const originalEnvValue = process.env[MIMALLOC_PURGE_DELAY];

  function getFreshLoadRolldown(): typeof import('./load-rolldown') {
    delete require.cache[require.resolve('./load-rolldown')];

    return require('./load-rolldown');
  }

  afterEach(() => {
    if (originalEnvValue !== undefined) {
      process.env[MIMALLOC_PURGE_DELAY] = originalEnvValue;
    } else {
      delete process.env[MIMALLOC_PURGE_DELAY];
    }
    delete require.cache[require.resolve('./load-rolldown')];
  });

  it('loads rolldown and cleans up temporary MIMALLOC_PURGE_DELAY when unset', async () => {
    delete process.env[MIMALLOC_PURGE_DELAY];
    const { loadRolldown } = getFreshLoadRolldown();

    const promise1 = loadRolldown();
    expect(process.env[MIMALLOC_PURGE_DELAY]).toBe('0');

    const promise2 = loadRolldown();
    expect(promise1).toBe(promise2);

    const rolldownModule = await promise1;
    expect(typeof rolldownModule.rolldown).toBe('function');
    expect(Object.hasOwn(process.env, MIMALLOC_PURGE_DELAY)).toBeFalse();
  });

  it('preserves user-configured MIMALLOC_PURGE_DELAY when already set', async () => {
    process.env[MIMALLOC_PURGE_DELAY] = '1000';
    const { loadRolldown } = getFreshLoadRolldown();

    const promise = loadRolldown();
    expect(process.env[MIMALLOC_PURGE_DELAY]).toBe('1000');

    const rolldownModule = await promise;
    expect(typeof rolldownModule.rolldown).toBe('function');
    expect(process.env[MIMALLOC_PURGE_DELAY]).toBe('1000');
  });
});
