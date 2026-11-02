import assert from 'node:assert';
import { getGlobalVariable } from '../../utils/env';
import { ng } from '../../utils/process';

export default async function () {
  assert(
    getGlobalVariable('argv')['esbuild'],
    'This test should not be called in the Webpack suite.',
  );

  const originalForceWasi = process.env['NAPI_RS_FORCE_WASI'];
  process.env['NAPI_RS_FORCE_WASI'] = 'error';

  try {
    await ng('build');
  } finally {
    if (originalForceWasi === undefined) {
      delete process.env['NAPI_RS_FORCE_WASI'];
    } else {
      process.env['NAPI_RS_FORCE_WASI'] = originalForceWasi;
    }
  }
}
