import assert from 'node:assert/strict';
import { applyVitestBuilder } from '../../utils/vitest';
import { ng } from '../../utils/process';
import path from 'node:path';

export default async function (): Promise<void> {
  await applyVitestBuilder();

  const { stdout } = await ng('test', '--include', path.resolve('src/app/app.spec.ts'));

  assert.match(stdout, /1 passed/, 'Expected 1 test to pass.');
}
