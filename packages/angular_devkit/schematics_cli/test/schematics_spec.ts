/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { PassThrough } from 'node:stream';
import { stripVTControlCharacters } from 'node:util';
import { main } from '../bin/schematics';

describe('schematics-cli binary', () => {
  let stdout: PassThrough, stderr: PassThrough;

  beforeEach(() => {
    stdout = new PassThrough();
    stderr = new PassThrough();
  });

  it('list-schematics works', async () => {
    const args = ['--list-schematics'];
    const res = await main({ args, stdout, stderr });
    const output = stripVTControlCharacters(stdout.read()?.toString() || '');
    expect(output).toMatch(/blank/);
    expect(output).toMatch(/schematic/);
    expect(res).toEqual(0);
  });

  it('errors when using camel case listSchematics', async () => {
    const args = ['--listSchematics'];
    await expectAsync(main({ args, stdout, stderr })).toBeRejectedWithError(
      'Unknown argument listSchematics. Did you mean list-schematics?',
    );
  });

  it('dry-run works', async () => {
    const args = ['blank', 'foo', '--dry-run'];
    const res = await main({ args, stdout, stderr });
    const output = stripVTControlCharacters(stdout.read()?.toString() || '');
    expect(output).toMatch(/CREATE foo\/README.md/);
    expect(output).toMatch(/CREATE foo\/.gitignore/);
    expect(output).toMatch(/CREATE foo\/src\/foo\/index.ts/);
    expect(output).toMatch(/CREATE foo\/src\/foo\/index_spec.ts/);
    expect(output).toMatch(/Dry run enabled./);
    expect(res).toEqual(0);
  });

  it('dry-run is default when debug mode', async () => {
    const args = ['blank', 'foo', '--debug'];
    const res = await main({ args, stdout, stderr });
    const output = stripVTControlCharacters(stdout.read()?.toString() || '');
    expect(output).toMatch(/Debug mode enabled./);
    expect(output).toMatch(/CREATE foo\/README.md/);
    expect(output).toMatch(/CREATE foo\/.gitignore/);
    expect(output).toMatch(/CREATE foo\/src\/foo\/index.ts/);
    expect(output).toMatch(/CREATE foo\/src\/foo\/index_spec.ts/);
    expect(output).toMatch(/Dry run enabled by default in debug mode./);
    expect(res).toEqual(0);
  });

  it('error when no name is provided', async () => {
    const args = ['blank'];
    const res = await main({ args, stdout, stderr });
    const output = stripVTControlCharacters(stderr.read()?.toString() || '');
    expect(output).toMatch(/Error: name option is required/);
    expect(res).toEqual(1);
  });
});
