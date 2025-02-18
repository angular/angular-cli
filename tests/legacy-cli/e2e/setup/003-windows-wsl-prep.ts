import { cp, realpath, symlink } from 'node:fs/promises';
import { isWindowsTestMode, windowsTmpDir } from '../utils/wsl';
import path from 'node:path';

/**
 * Configure Windows WSL test setup, if needed.
 */
export default async function () {
  const windowsMode = isWindowsTestMode();
  if (windowsMode === null) {
    return;
  }

  // Unwrap the symlink of Windows. Windows will otherwise not be able to execute the binary.
  // Trick: We use the promises-variant as that one is not patched by Aspect and can resolve outside sandbox/runfiles.
  const downloadedNodeBinary = await realpath(windowsMode.nodeBinaryForWindowsInsideWslPath);

  // We will copy the Node version outside of WSL, as otherwise junctions to inside WSL,
  // or the UNC path system messes up npm.
  await cp(downloadedNodeBinary, windowsMode.nodeBinaryForWindowsPath);

  // Expose Git binary in path. Node is already exposes via the NPM directory.
  // These global tools are used by e2e tests.
  process.env['PATH'] = [process.env.PATH, windowsMode.gitBinaryDirForWindows].join(path.delimiter);
}
