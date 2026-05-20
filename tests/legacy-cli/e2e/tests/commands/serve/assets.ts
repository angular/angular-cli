import assert from 'node:assert';
import { ngServe } from '../../../utils/project';
import { getGlobalVariable } from '../../../utils/env';

export default async function () {
  const port = await ngServe();
  let response = await fetch(`http://localhost:${port}/favicon.ico`);
  assert.strictEqual(response.status, 200, 'favicon.ico response should be ok');

  // A non-existent HTML file request with accept header should fallback to the index HTML
  response = await fetch(`http://localhost:${port}/does-not-exist.html`, {
    headers: { accept: 'text/html' },
  });
  assert.strictEqual(response.status, 200, 'non-existent file response should fallback and be ok');
  assert.match(
    await response.text(),
    /<app-root/,
    'non-existent file response should fallback and contain html',
  );

  // Vite will incorrectly fallback in all non-existent cases  so skip last test case
  // TODO: Remove conditional when Vite handles this case
  if (getGlobalVariable('argv')['esbuild']) {
    return;
  }

  // A non-existent file without an html accept header should not be found.
  response = await fetch(`http://localhost:${port}/does-not-exist.png`);
  assert.strictEqual(response.status, 404, 'non-existent file response should be not found');
}
