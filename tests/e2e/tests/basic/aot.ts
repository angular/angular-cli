import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ng } from '../../utils/process';

/**
 * AOT builds should contain generated component factories
 */
export default async function () {
  await ng('build', '--aot=true', '--configuration=development');
  const content = await readFile('dist/test-project/browser/main.js', 'utf-8');
  assert.match(content, /App_Factory/);
}
