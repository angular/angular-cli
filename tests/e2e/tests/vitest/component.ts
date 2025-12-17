import assert from 'node:assert/strict';
import { applyVitestBuilder } from '../../utils/vitest';
import { ng } from '../../utils/process';

export default async function (): Promise<void> {
  await applyVitestBuilder();
  await ng('generate', 'component', 'my-comp');

  const { stdout } = await ng('test');

  assert.match(stdout, /2 passed/, 'Expected 2 tests to pass.');
}
