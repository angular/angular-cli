/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { type VitestCliOptionsSource, createVitestCliOptions } from './cli-options';

describe('createVitestCliOptions', () => {
  const baseOptions: VitestCliOptionsSource = {
    workspaceRoot: '/workspace',
    watch: false,
    outputFile: undefined,
    cacheOptions: { enabled: true },
    filter: undefined,
    ui: undefined,
    debug: false,
  };

  it('should provide the root, project, watch mode, and configuration file', () => {
    expect(createVitestCliOptions(baseOptions, 'app', '/workspace/vitest-base.config.mts')).toEqual(
      {
        config: '/workspace/vitest-base.config.mts',
        root: '/workspace',
        project: 'app',
        watch: false,
      },
    );
  });

  it('should disable configuration file lookup when no configuration file is used', () => {
    expect(createVitestCliOptions(baseOptions, 'app', false).config).toBeFalse();
  });

  it('should only include the output file when it is defined', () => {
    expect('outputFile' in createVitestCliOptions(baseOptions, 'app', false)).toBeFalse();
    expect(
      createVitestCliOptions({ ...baseOptions, outputFile: 'results.json' }, 'app', false)
        .outputFile,
    ).toBe('results.json');
  });

  it('should disable the Vitest cache when the Angular CLI cache is disabled', () => {
    expect('cache' in createVitestCliOptions(baseOptions, 'app', false)).toBeFalse();
    expect(
      createVitestCliOptions({ ...baseOptions, cacheOptions: { enabled: false } }, 'app', false)
        .cache,
    ).toBeFalse();
  });

  it('should map the filter option to the test name pattern', () => {
    expect('testNamePattern' in createVitestCliOptions(baseOptions, 'app', false)).toBeFalse();
    expect(
      createVitestCliOptions({ ...baseOptions, filter: 'should work' }, 'app', false)
        .testNamePattern,
    ).toBe('should work');
  });

  it('should only include the UI option when it is a boolean', () => {
    expect('ui' in createVitestCliOptions(baseOptions, 'app', false)).toBeFalse();
    expect(createVitestCliOptions({ ...baseOptions, ui: false }, 'app', false).ui).toBeFalse();
    expect(createVitestCliOptions({ ...baseOptions, ui: true }, 'app', false).ui).toBeTrue();
  });

  it('should configure the inspector and disable parallelism when debugging', () => {
    const options = createVitestCliOptions({ ...baseOptions, debug: true }, 'app', false);

    expect(options.inspectBrk).toBeTrue();
    expect(options.isolate).toBeFalse();
    expect(options.fileParallelism).toBeFalse();
  });

  it('should include the options from the runner arguments', () => {
    const options = createVitestCliOptions(baseOptions, 'app', false, { update: true, bail: 1 });

    expect(options.update).toBeTrue();
    expect(options.bail).toBe(1);
  });

  it('should prefer the builder options over the options from the runner arguments', () => {
    const options = createVitestCliOptions({ ...baseOptions, filter: 'builder' }, 'app', false, {
      root: '/other',
      watch: true,
      testNamePattern: 'runner',
    });

    expect(options.root).toBe('/workspace');
    expect(options.watch).toBeFalse();
    expect(options.testNamePattern).toBe('builder');
  });

  it('should not configure the inspector when not debugging', () => {
    const options = createVitestCliOptions(baseOptions, 'app', false);

    expect('inspectBrk' in options).toBeFalse();
    expect('isolate' in options).toBeFalse();
    expect('fileParallelism' in options).toBeFalse();
  });
});
