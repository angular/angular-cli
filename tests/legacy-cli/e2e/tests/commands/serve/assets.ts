import assert from 'node:assert';
import { randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { ngServe, updateJsonFile } from '../../../utils/project';
import { getGlobalVariable } from '../../../utils/env';

export default async function () {
  const outsideDirectoryName = `../outside-${randomUUID()}`;

  await updateJsonFile('angular.json', (json) => {
    json.projects['test-project'].architect.build.options.assets = [
      'src/favicon.ico',
      'src/assets',
      // Ensure assets located outside the workspace root work with the dev server
      { 'input': outsideDirectoryName, 'glob': '**/*', 'output': './outside' },
    ];
  });

  await mkdir(outsideDirectoryName);
  try {
    await writeFile(`${outsideDirectoryName}/some-asset.xyz`, 'XYZ');

    const port = await ngServe();

    let response = await fetch(`http://localhost:${port}/favicon.ico`);
    assert.strictEqual(response.status, 200, 'favicon.ico response should be ok');

    response = await fetch(`http://localhost:${port}/outside/some-asset.xyz`);
    assert.strictEqual(response.status, 200, 'outside/some-asset.xyz response should be ok');
    assert.strictEqual(await response.text(), 'XYZ', 'outside/some-asset.xyz content is wrong');

    // A non-existent HTML file request with accept header should fallback to the index HTML
    response = await fetch(`http://localhost:${port}/does-not-exist.html`, {
      headers: { accept: 'text/html' },
    });
    assert.strictEqual(
      response.status,
      200,
      'non-existent file response should fallback and be ok',
    );
    assert.match(
      await response.text(),
      /<app-root/,
      'non-existent file response should fallback and contain html',
    );

    // Vite will incorrectly fallback in all non-existent cases so skip last test case
    // TODO: Remove conditional when Vite handles this case
    if (getGlobalVariable('argv')['esbuild']) {
      return;
    }

    // A non-existent file without an html accept header should not be found.
    response = await fetch(`http://localhost:${port}/does-not-exist.png`);
    assert.strictEqual(response.status, 404, 'non-existent file response should be not found');
  } finally {
    await rm(outsideDirectoryName, { force: true, recursive: true });
  }
}
