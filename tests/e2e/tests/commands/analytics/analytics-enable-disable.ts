import assert from 'node:assert';
import { readFile } from '../../../utils/fs';
import { ng } from '../../../utils/process';

export default async function () {
  await ng('analytics', 'enable');
  assert.ok(JSON.parse(await readFile('angular.json')).cli.analytics);

  await ng('analytics', 'disable');
  assert.strictEqual(JSON.parse(await readFile('angular.json')).cli.analytics, false);
}
