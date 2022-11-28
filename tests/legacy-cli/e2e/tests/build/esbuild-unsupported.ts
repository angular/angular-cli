import { join } from 'path';
import { execWithEnv } from '../../utils/process';

export default async function () {
  // Set the esbuild native binary path to a non-existent file to simulate a spawn error.
  // The build should still succeed by falling back to the WASM variant of esbuild.
  await execWithEnv('ng', ['build'], {
    ...process.env,
    'ESBUILD_BINARY_PATH': join(__dirname, 'esbuild-bin-no-exist-xyz'),
  });
}
