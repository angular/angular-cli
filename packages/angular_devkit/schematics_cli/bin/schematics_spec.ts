/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { main } from './schematics';

// We only care about the write method in these mocks of NodeJS.WriteStream.
class MockWriteStream {
  lines: string[] = [];
  write(str: string) {
    // Strip color control characters.
    this.lines.push(str.replace(/[^\x20-\x7F]\[\d+m/g, ''));

    return true;
  }
}

describe('schematics-cli binary', () => {
  let stdout: MockWriteStream, stderr: MockWriteStream;

  beforeEach(() => {
    stdout = new MockWriteStream();
    stderr = new MockWriteStream();
  });

  it('list-schematics works', async () => {
    const args = ['--list-schematics'];
    const res = await main({ args, stdout, stderr });
    expect(stdout.lines).toMatch(/blank/);
    expect(stdout.lines).toMatch(/schematic/);
    expect(res).toEqual(0);
  });

  it('listSchematics works', async () => {
    const args = ['--listSchematics'];
    const res = await main({ args, stdout, stderr });
    expect(stdout.lines).toMatch(/blank/);
    expect(stdout.lines).toMatch(/schematic/);
    expect(res).toEqual(0);
  });

  it('dry-run works', async () => {
    const args = ['blank', 'foo', '--dry-run'];
    const res = await main({ args, stdout, stderr });
    expect(stdout.lines).toMatch(/CREATE \/foo\/README.md/);
    expect(stdout.lines).toMatch(/CREATE \/foo\/.gitignore/);
    expect(stdout.lines).toMatch(/CREATE \/foo\/src\/foo\/index.ts/);
    expect(stdout.lines).toMatch(/CREATE \/foo\/src\/foo\/index_spec.ts/);
    expect(res).toEqual(0);
  });

  it('dry-run is default when debug mode', async () => {
    const args = ['blank', 'foo', '--debug'];
    const res = await main({ args, stdout, stderr });
    expect(stdout.lines).toMatch(/CREATE \/foo\/README.md/);
    expect(stdout.lines).toMatch(/CREATE \/foo\/.gitignore/);
    expect(stdout.lines).toMatch(/CREATE \/foo\/src\/foo\/index.ts/);
    expect(stdout.lines).toMatch(/CREATE \/foo\/src\/foo\/index_spec.ts/);
    expect(res).toEqual(0);
  });

  it('error when no name is provided', async () => {
    const args = ['blank'];
    const res = await main({ args, stdout, stderr });
    expect(stderr.lines).toMatch(/Error: name option is required/);
    expect(res).toEqual(1);
  });
});
