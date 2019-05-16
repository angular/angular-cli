/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { basename, dirname, join } from 'path';
import { main } from './main';
// tslint:disable-next-line:no-implicit-dependencies
const temp = require('temp');


// We only care about the write method in these mocks of NodeJS.WriteStream.
class MockWriteStream {
  lines: string[] = [];
  write(str: string) {
    // Strip color control characters.
    this.lines.push(str.replace(/[^\x20-\x7F]\[\d+m/g, ''));

    return true;
  }
}

describe('benchmark binary', () => {
  const benchmarkScript = require.resolve(join(__dirname, './test/fibonacci.js'));
  const exitCodeOneScript = require.resolve(join(__dirname, './test/exit-code-one.js'));
  const outputFileRoot = temp.mkdirSync('benchmark-binary-spec-');
  const outputFile = join(outputFileRoot, 'output.log');
  let stdout: MockWriteStream, stderr: MockWriteStream;

  beforeEach(() => {
    stdout = new MockWriteStream();
    stderr = new MockWriteStream();
  });

  afterEach(() => {
    if (existsSync(outputFile)) { unlinkSync(outputFile); }
  });

  it('works', async () => {
    const args = ['--', 'node', benchmarkScript, '30'];
    const res = await main({ args, stdout, stderr });
    expect(stdout.lines).toContain('[benchmark] Process Stats\n');
    expect(res).toEqual(0);
  });

  it('fails with no command', async () => {
    const args: string[] = [];
    const res = await main({ args, stdout, stderr });
    expect(stderr.lines).toContain(
      '[benchmark] Missing command, see benchmark --help for help.\n');
    expect(res).toEqual(1);
  });

  it('fails with when exit code is not expected', async () => {
    const args: string[] = ['--', 'node', exitCodeOneScript];
    const res = await main({ args, stdout, stderr });
    expect(stderr.lines).toContain(
      '[benchmark] Maximum number of retries (5) for command was exceeded.\n');
    expect(res).toEqual(1);
  });

  it('prints help', async () => {
    const args = ['--help'];
    const res = await main({ args, stdout, stderr });
    // help is a multiline write.
    expect(stdout.lines[0]).toContain('Options:\n');
    expect(res).toEqual(0);
  });

  it('uses verbose', async () => {
    const args = ['--verbose', '--', 'node', benchmarkScript, '30'];
    const res = await main({ args, stdout, stderr });
    expect(stdout.lines).toContain('[benchmark] Run #1: finished successfully\n');
    expect(res).toEqual(0);
  });

  it('uses exit code', async () => {
    const args = ['--exit-code', '1', '--', 'node', exitCodeOneScript];
    const res = await main({ args, stdout, stderr });
    expect(stdout.lines).toContain('[benchmark] Process Stats\n');
    expect(res).toEqual(0);
  });

  it('uses iterations', async () => {
    const args = ['--iterations', '3', '--', 'node', benchmarkScript, '30'];
    const res = await main({ args, stdout, stderr });
    expect(stdout.lines).toContain(
      '[benchmark] Benchmarking process over 3 iterations, with up to 5 retries.\n');
    expect(res).toEqual(0);
  });

  it('uses retries', async () => {
    const args = ['--retries', '3', '--', 'node', benchmarkScript, '30'];
    const res = await main({ args, stdout, stderr });
    expect(stdout.lines).toContain(
      '[benchmark] Benchmarking process over 5 iterations, with up to 3 retries.\n');
    expect(res).toEqual(0);
  });

  it('uses cwd', async () => {
    const args = ['--cwd', dirname(benchmarkScript), '--', 'node', basename(benchmarkScript), '30'];
    const res = await main({ args, stdout, stderr });
    expect(stdout.lines).toContain('[benchmark] Process Stats\n');
    expect(res).toEqual(0);
  });

  it('uses output-file', async () => {
    const args = ['--output-file', outputFile, '--', 'node', benchmarkScript, '30'];
    const res = await main({ args, stdout, stderr });
    expect(res).toEqual(0);
    expect(existsSync(outputFile)).toBe(true, 'outputFile exists');
    expect(readFileSync(outputFile, 'utf-8')).toContain('[benchmark] Process Stats');
  });

  it('appends to output-file', async () => {
    writeFileSync(outputFile, 'existing line');
    const args = ['--output-file', outputFile, '--', 'node', benchmarkScript, '30'];
    const res = await main({ args, stdout, stderr });
    expect(res).toEqual(0);
    expect(existsSync(outputFile)).toBe(true, 'outputFile exists');
    expect(readFileSync(outputFile, 'utf-8')).toContain('existing line');
  });

  it('overwrites output-file', async () => {
    writeFileSync(outputFile, 'existing line');
    const args = [
      '--output-file', outputFile, '--overwrite-output-file',
      '--', 'node', benchmarkScript, '30',
    ];
    const res = await main({ args, stdout, stderr });
    expect(res).toEqual(0);
    expect(existsSync(outputFile)).toBe(true, 'outputFile exists');
    expect(readFileSync(outputFile, 'utf-8')).not.toContain('existing line');
  });

  it('uses prefix', async () => {
    const args = ['--prefix', '[abc]', '--', 'node', benchmarkScript, '30'];
    const res = await main({ args, stdout, stderr });
    stdout.lines.forEach(line => expect(line).toMatch(/^\[abc\]/));
    expect(res).toEqual(0);
  });
});
