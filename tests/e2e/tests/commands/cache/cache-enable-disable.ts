import assert from 'node:assert/strict';
import { readFile } from '../../../utils/fs';
import { ng } from '../../../utils/process';

export default async function () {
  await ng('cache', 'enable');
  assert.strictEqual(
    JSON.parse(await readFile('angular.json')).cli.cache.enabled,
    true,
    `Expected 'cli.cache.enable' to be true.`,
  );

  await ng('cache', 'disable');
  assert.strictEqual(
    JSON.parse(await readFile('angular.json')).cli.cache.enabled,
    false,
    `Expected 'cli.cache.enable' to be false.`,
  );
}
