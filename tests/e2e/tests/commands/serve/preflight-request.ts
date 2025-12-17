import assert from 'node:assert/strict';
import { ngServe } from '../../../utils/project';

export default async function () {
  const port = await ngServe();
  const result = await fetch(`http://localhost:${port}/main.js`, { method: 'OPTIONS' });
  const content = await result.blob();

  assert.strictEqual(content.size, 0, `Expected "size" to be "0" but got "${content.size}".`);
  assert.strictEqual(
    result.status,
    204,
    `Expected "status" to be "204" but got "${result.status}".`,
  );
}
