import assert from 'node:assert/strict';
import { applyVitestBuilder } from '../../utils/vitest';
import { ng } from '../../utils/process';

export default async function (): Promise<void> {
  await applyVitestBuilder();

  const { stderr } = await ng('test');

  assert.match(
    stderr,
    /NOTE: The "unit-test" builder is currently EXPERIMENTAL/,
    'Expected stderr to include the experimental notice.',
  );
}
