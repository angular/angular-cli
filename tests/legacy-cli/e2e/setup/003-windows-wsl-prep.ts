import { cp, mkdir, realpath } from 'node:fs/promises';
import path from 'node:path';
import { getGlobalVariable } from '../utils/env';
import { interopWslPathForOutsideIfNecessary, isWindowsTestMode } from '../utils/wsl';

/**
 * Configure Windows WSL test setup, if needed.
 */
export default async function () {
  const windowsMode = isWindowsTestMode();
  if (windowsMode === null) {
    return;
  }

  // Expose Git binary in path. Node is already exposes via the NPM directory.
  // These global tools are used by e2e tests.
  process.env['PATH'] = [process.env.PATH, windowsMode.gitBinaryDirForWindows].join(path.delimiter);

  // Unwrap the symlinks by Bazel. Windows will otherwise not be able to execute the binary.
  // Trick: We use the promises-variant as that one is not patched by Aspect and can resolve outside sandbox/runfiles.
  const downloadedNodeBinary = await realpath(windowsMode.wslRootBinariesNeedingCopy.nodePath);
  const downloadedChromium = await realpath(windowsMode.wslRootBinariesNeedingCopy.chromiumPath);
  const downloadedChromedriver = await realpath(
    windowsMode.wslRootBinariesNeedingCopy.chromedriverPath,
  );

  // We will copy the Node version outside of WSL, as otherwise junctions to inside WSL,
  // or the UNC path system messes up npm.
  await cp(downloadedNodeBinary, windowsMode.copiedWindowsBinaries.nodePath);

  const tmpRoot = getGlobalVariable('tmp-root');
  const chromeTestingTmpDir = path.join(tmpRoot, 'chrome-testing-tools');
  const chromiumDestDir = path.join(tmpRoot, 'chromium');
  const chromedriverDestDir = path.join(tmpRoot, 'chromedriver');

  await mkdir(chromeTestingTmpDir);
  await cp(path.dirname(downloadedChromium), chromiumDestDir, { recursive: true });
  await cp(path.dirname(downloadedChromedriver), chromedriverDestDir, { recursive: true });

  const chromiumBinDestPath = path.join(chromiumDestDir, path.basename(downloadedChromium));
  const chromedriverBinDestPath = path.join(
    chromedriverDestDir,
    path.basename(downloadedChromedriver),
  );

  process.env.CHROME_BIN = interopWslPathForOutsideIfNecessary(chromiumBinDestPath);
  process.env.CHROME_PATH = interopWslPathForOutsideIfNecessary(chromiumBinDestPath);
  process.env.CHROMEDRIVER_BIN = interopWslPathForOutsideIfNecessary(chromedriverBinDestPath);

  // Update `TEMP` to the Windows tmp root that we configure in 001-create-tmp-dir.
  // Otherwise we'd spawn Node processes outside WSL with a temp dir in the WSL VM.
  process.env.TEMP = tmpRoot;
}
