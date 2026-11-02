import assert from 'node:assert';
import { getGlobalVariable } from '../../utils/env';
import { ngServe } from '../../utils/project';

export default async function () {
  assert(
    getGlobalVariable('argv')['esbuild'],
    'This test should not be called in the Webpack suite.',
  );

  const originalForceWasi = process.env['NAPI_RS_FORCE_WASI'];
  process.env['NAPI_RS_FORCE_WASI'] = 'true';

  try {
    const port = await ngServe();
    const response = await fetch(`http://localhost:${port}/`);
    assert(response.ok, 'Expected response to be ok');
    const text = await response.text();
    assert.match(text, /<app-root/);
  } finally {
    if (originalForceWasi === undefined) {
      delete process.env['NAPI_RS_FORCE_WASI'];
    } else {
      process.env['NAPI_RS_FORCE_WASI'] = originalForceWasi;
    }
  }
}
