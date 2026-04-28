/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { filterMetafile } from './utils';

// Derive the Metafile type from filterMetafile's own signature to avoid a direct esbuild import.
type TestMetafile = Parameters<typeof filterMetafile>[0];

/**
 * Builds a minimal Metafile-shaped object for testing filterMetafile.
 * @param outputsWithInputs Maps each output path to the input paths it references.
 * @param unreferencedInputs Additional input paths that exist in the metafile but
 *   are not referenced by any output.
 */
function createMetafile(
  outputsWithInputs: Record<string, string[]>,
  unreferencedInputs: string[] = [],
): TestMetafile {
  const inputs: TestMetafile['inputs'] = {};
  const outputs: TestMetafile['outputs'] = {};

  for (const path of unreferencedInputs) {
    inputs[path] = { bytes: 0, imports: [] };
  }

  for (const [outputPath, inputPaths] of Object.entries(outputsWithInputs)) {
    const outputInputs: TestMetafile['outputs'][string]['inputs'] = {};
    for (const inputPath of inputPaths) {
      outputInputs[inputPath] = { bytesInOutput: 0 };
      inputs[inputPath] ??= { bytes: 0, imports: [] };
    }
    outputs[outputPath] = { bytes: 0, inputs: outputInputs, imports: [], exports: [] };
  }

  return { inputs, outputs };
}

describe('filterMetafile', () => {
  it('returns only outputs matching the predicate', () => {
    const metafile = createMetafile({
      'browser/main.js': ['src/main.ts'],
      'browser/polyfills.js': ['src/polyfills.ts'],
      'server/server.mjs': ['src/server.ts'],
    });

    const result = filterMetafile(metafile, (path) => path.startsWith('browser/'));

    expect(Object.keys(result.outputs)).toEqual(
      jasmine.arrayContaining(['browser/main.js', 'browser/polyfills.js']),
    );
    expect(Object.keys(result.outputs)).not.toContain('server/server.mjs');
  });

  it('includes only inputs referenced by outputs that match the predicate', () => {
    const metafile = createMetafile({
      'browser/main.js': ['src/main.ts', 'src/app.ts'],
      'server/server.mjs': ['src/server.ts'],
    });

    const result = filterMetafile(metafile, (path) => path.startsWith('browser/'));

    expect(Object.keys(result.inputs)).toContain('src/main.ts');
    expect(Object.keys(result.inputs)).toContain('src/app.ts');
    expect(Object.keys(result.inputs)).not.toContain('src/server.ts');
  });

  it('excludes unreferenced inputs even when they exist in the original metafile', () => {
    const metafile = createMetafile({ 'browser/main.js': ['src/main.ts'] }, [
      'src/unreferenced.ts',
    ]);

    const result = filterMetafile(metafile, () => true);

    expect(Object.keys(result.inputs)).not.toContain('src/unreferenced.ts');
  });

  it('returns empty outputs and inputs when predicate never matches', () => {
    const metafile = createMetafile({
      'browser/main.js': ['src/main.ts'],
      'browser/polyfills.js': ['src/polyfills.ts'],
    });

    const result = filterMetafile(metafile, () => false);

    expect(Object.keys(result.outputs)).toEqual([]);
    expect(Object.keys(result.inputs)).toEqual([]);
  });

  it('returns all outputs and their referenced inputs when predicate always matches', () => {
    const metafile = createMetafile({
      'browser/main.js': ['src/main.ts'],
      'browser/polyfills.js': ['src/polyfills.ts'],
    });

    const result = filterMetafile(metafile, () => true);

    expect(Object.keys(result.outputs).length).toBe(2);
    expect(Object.keys(result.inputs)).toEqual(
      jasmine.arrayContaining(['src/main.ts', 'src/polyfills.ts']),
    );
  });

  it('deduplicates inputs referenced by multiple matching outputs', () => {
    const metafile = createMetafile({
      'browser/main.js': ['src/shared.ts', 'src/main.ts'],
      'browser/polyfills.js': ['src/shared.ts', 'src/polyfills.ts'],
    });

    const result = filterMetafile(metafile, () => true);

    const inputKeys = Object.keys(result.inputs);
    const sharedOccurrences = inputKeys.filter((k) => k === 'src/shared.ts').length;
    expect(sharedOccurrences).toBe(1);
  });

  it('does not mutate the original metafile', () => {
    const metafile = createMetafile({
      'browser/main.js': ['src/main.ts'],
      'server/server.mjs': ['src/server.ts'],
    });
    const originalOutputCount = Object.keys(metafile.outputs).length;
    const originalInputCount = Object.keys(metafile.inputs).length;

    filterMetafile(metafile, (path) => path.startsWith('browser/'));

    expect(Object.keys(metafile.outputs).length).toBe(originalOutputCount);
    expect(Object.keys(metafile.inputs).length).toBe(originalInputCount);
  });
});
