/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { availableParallelism } from 'node:os';

describe('environment options - maxWorkers', () => {
  const originalEnvValue = process.env['NG_BUILD_MAX_WORKERS'];

  function loadEnvironmentOptions(): typeof import('./environment-options') {
    delete require.cache[require.resolve('./environment-options')];

    return require('./environment-options');
  }

  afterEach(() => {
    if (originalEnvValue !== undefined) {
      process.env['NG_BUILD_MAX_WORKERS'] = originalEnvValue;
    } else {
      delete process.env['NG_BUILD_MAX_WORKERS'];
    }
    delete require.cache[require.resolve('./environment-options')];
  });

  it('defaults maxWorkers to availableParallelism - 1 when NG_BUILD_MAX_WORKERS is unset', () => {
    delete process.env['NG_BUILD_MAX_WORKERS'];
    const { maxWorkers, hasCustomMaxWorkers } = loadEnvironmentOptions();

    expect(hasCustomMaxWorkers).toBeFalse();
    expect(maxWorkers).toBe(Math.max(availableParallelism() - 1, 1));
  });

  it('uses configured positive integer when NG_BUILD_MAX_WORKERS is set', () => {
    process.env['NG_BUILD_MAX_WORKERS'] = '8';
    const { maxWorkers, hasCustomMaxWorkers } = loadEnvironmentOptions();

    expect(hasCustomMaxWorkers).toBeTrue();
    expect(maxWorkers).toBe(8);
  });

  it('allows maxWorkers greater than 4 when explicitly configured', () => {
    process.env['NG_BUILD_MAX_WORKERS'] = '32';
    const { maxWorkers, hasCustomMaxWorkers } = loadEnvironmentOptions();

    expect(hasCustomMaxWorkers).toBeTrue();
    expect(maxWorkers).toBe(32);
  });

  it('supports maxWorkers set to 1', () => {
    process.env['NG_BUILD_MAX_WORKERS'] = '1';
    const { maxWorkers, hasCustomMaxWorkers } = loadEnvironmentOptions();

    expect(hasCustomMaxWorkers).toBeTrue();
    expect(maxWorkers).toBe(1);
  });

  it('falls back to availableParallelism - 1 when NG_BUILD_MAX_WORKERS is 0', () => {
    process.env['NG_BUILD_MAX_WORKERS'] = '0';
    const { maxWorkers, hasCustomMaxWorkers } = loadEnvironmentOptions();

    expect(hasCustomMaxWorkers).toBeFalse();
    expect(maxWorkers).toBe(Math.max(availableParallelism() - 1, 1));
  });

  it('falls back to availableParallelism - 1 when NG_BUILD_MAX_WORKERS is negative', () => {
    process.env['NG_BUILD_MAX_WORKERS'] = '-4';
    const { maxWorkers, hasCustomMaxWorkers } = loadEnvironmentOptions();

    expect(hasCustomMaxWorkers).toBeFalse();
    expect(maxWorkers).toBe(Math.max(availableParallelism() - 1, 1));
  });

  it('falls back to availableParallelism - 1 when NG_BUILD_MAX_WORKERS is not a number', () => {
    process.env['NG_BUILD_MAX_WORKERS'] = 'invalid';
    const { maxWorkers, hasCustomMaxWorkers } = loadEnvironmentOptions();

    expect(hasCustomMaxWorkers).toBeFalse();
    expect(maxWorkers).toBe(Math.max(availableParallelism() - 1, 1));
  });

  it('falls back to availableParallelism - 1 when NG_BUILD_MAX_WORKERS is a float', () => {
    process.env['NG_BUILD_MAX_WORKERS'] = '2.5';
    const { maxWorkers, hasCustomMaxWorkers } = loadEnvironmentOptions();

    expect(hasCustomMaxWorkers).toBeFalse();
    expect(maxWorkers).toBe(Math.max(availableParallelism() - 1, 1));
  });

  it('falls back to availableParallelism - 1 when NG_BUILD_MAX_WORKERS is an empty string', () => {
    process.env['NG_BUILD_MAX_WORKERS'] = '';
    const { maxWorkers, hasCustomMaxWorkers } = loadEnvironmentOptions();

    expect(hasCustomMaxWorkers).toBeFalse();
    expect(maxWorkers).toBe(Math.max(availableParallelism() - 1, 1));
  });

  it('falls back to availableParallelism - 1 when NG_BUILD_MAX_WORKERS is whitespace only', () => {
    process.env['NG_BUILD_MAX_WORKERS'] = '   ';
    const { maxWorkers, hasCustomMaxWorkers } = loadEnvironmentOptions();

    expect(hasCustomMaxWorkers).toBeFalse();
    expect(maxWorkers).toBe(Math.max(availableParallelism() - 1, 1));
  });

  it('parses positive integers with surrounding whitespace', () => {
    process.env['NG_BUILD_MAX_WORKERS'] = '  8  ';
    const { maxWorkers, hasCustomMaxWorkers } = loadEnvironmentOptions();

    expect(hasCustomMaxWorkers).toBeTrue();
    expect(maxWorkers).toBe(8);
  });
});
