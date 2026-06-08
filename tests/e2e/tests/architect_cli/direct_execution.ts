import * as assert from 'node:assert/strict';
import { exec } from '../../utils/process';
import { join } from 'node:path';

export default async function () {
  // Run help command
  const binPath = join('node_modules', '.bin', 'architect');
  const { stdout } = await exec(binPath, '--help');

  assert.ok(
    stdout.includes('architect [project][:target][:configuration] [options, ...]'),
    'Expected stdout to contain usage information.',
  );
}
