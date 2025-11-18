import assert from 'node:assert/strict';
import { applyVitestBuilder } from '../../utils/vitest';
import { ng } from '../../utils/process';
import path from 'node:path';

export default async function (): Promise<void> {
  await applyVitestBuilder();

  const { stdout: stdout1 } = await ng('test', '--include', path.resolve('src/app/app.spec.ts'));
  assert.match(stdout1, /1 passed/, 'Expected 1 test to pass with absolute include.');

  const { stdout: stdout2 } = await ng('test', '--include', path.normalize('src/app/app.spec.ts'));
  assert.match(stdout2, /1 passed/, 'Expected 1 test to pass with relative include.');
}
