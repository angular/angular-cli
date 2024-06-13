import assert from 'node:assert';
import { noSilentNg } from '../../utils/process';
import { applyWtrBuilder } from '../../utils/web-test-runner';

export default async function () {
  await applyWtrBuilder();

  const { stderr } = await noSilentNg('test');

  assert.match(stderr, /Web Test Runner builder is currently EXPERIMENTAL/);
}
