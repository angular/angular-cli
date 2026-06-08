import assert from 'node:assert/strict';
import { ng } from '../../utils/process';

export default async function () {
  // Verify that there are no duplicate options
  const { stdout } = await ng('generate', 'component', '--help');
  const firstIndex = stdout.indexOf('--prefix');

  assert.ok(firstIndex >= 0, '--prefix was not part of the help output.');
  assert.strictEqual(
    firstIndex,
    stdout.lastIndexOf('--prefix'),
    '--prefix first and last index were different. Possible duplicate output!',
  );
}
