import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import child_process from 'node:child_process';
import { getGlobalVariable } from './env';

/** Cached Windows test mode value, avoiding recomputation. */
let _cachedWindowsTestMode: WindowsWslTestMode | null | undefined = undefined;

/**
 * Type describing an object that will hold all relevant information
 * for supporting native Windows testing through WSL.
 */
interface WindowsWslTestMode {
  cmdPath: string;
  gitBinaryDirForWindows: string;
  npmBinaryForWindowsPath: string;
  wslRootPath: string;
  wslUncBase: string;

  // Those binaries are downloaded by Bazel inside WSL but in practice
  // need to be copied to the host system to function properly.
  wslRootBinariesNeedingCopy: {
    chromedriverPath: string;
    chromiumPath: string;
    nodePath: string;
  };
  copiedWindowsBinaries: {
    nodePath: string;
  };
}

/**
 * Path to a temporary directory inside the Windows host file system.
 * e.g. `/mnt/c/Users/runner/AppData/Local/Temp`
 */
export const windowsTmpDir = process.env['NG_E2E_RUNNER_WINDOWS_TMP_DIR'];

/**
 * Whether the given path needs to be translated to a Windows native path,
 * using `wslpath -w`. This is useful when detecting paths in CLI arguments.
 */
export function shouldInteropWslPath(p: string): boolean {
  return p.startsWith('/') && fs.existsSync(p);
}

/**
 * Translates the given Unix WSL path into a Windows host system path, if
 * necessary, decided via {@link shouldInteropWslPath}.
 */
export function interopWslPathForOutsideIfNecessary(p: string): string {
  const windowsMode = isWindowsTestMode();
  assert(windowsMode !== null);

  if (shouldInteropWslPath(p)) {
    return (
      wslpath('-w', p)
        // Note: We expect a fake symlinked WSL root directory in our host's
        // main drive. This is necessary because `npm publish` does not work
        // with UNC paths, like `\\wsl.localhost\Debian\<..>`.
        .replace(windowsMode.wslUncBase, windowsMode.wslRootPath)
    );
  }
  return p;
}

/**
 * Gets whether we are currently testing native Windows.
 *
 * If so, returns an object exposing relevant information for
 * supporting such testing mode,
 */
export function isWindowsTestMode(): WindowsWslTestMode | null {
  if (_cachedWindowsTestMode !== undefined) {
    return _cachedWindowsTestMode;
  }

  const cmdEnv = process.env['NG_E2E_RUNNER_WINDOWS_CMD'];
  if (cmdEnv === undefined) {
    _cachedWindowsTestMode = null;
    return null;
  }

  const windowsNpmBin = process.env['NG_E2E_RUNNER_WINDOWS_NPM'];
  assert(windowsNpmBin, 'Expected Windows npm binary to be specified.');

  const windowsNodeRepoShortPath = process.env['NG_E2E_WINDOWS_REPO_SHORT_PATH'];
  assert(windowsNodeRepoShortPath, 'Expected Windows binaries to be available.');

  const wslRootPath = process.env['NG_E2E_RUNNER_WSL_ROOT'];
  assert(wslRootPath, 'Expected WSL root path to be passed.');

  const wslUncBase = process.env['NG_E2E_RUNNER_WSL_UNC_BASE'];
  assert(wslUncBase, 'Expected WSL Unc base to be passed.');

  const gitBinaryForWindows = process.env['NG_E2E_RUNNER_WINDOWS_GIT_BASH_BIN'];
  assert(gitBinaryForWindows, 'Expected Git Bash bin to be passed.');

  const bazelTestWorkingDir = getGlobalVariable('bazel-test-working-dir');
  const npmDir = getGlobalVariable('npm-global');
  const nodeRepositoryDir = path.resolve(
    bazelTestWorkingDir,
    windowsNodeRepoShortPath,
    'bin/nodejs',
  );

  return (_cachedWindowsTestMode = {
    cmdPath: cmdEnv,
    gitBinaryDirForWindows: path.dirname(gitBinaryForWindows),
    npmBinaryForWindowsPath: windowsNpmBin,
    wslRootPath,
    wslUncBase,
    // We will copy the Node version outside of WSL because NPM might
    // have problems executing with the UNC path. See:
    // https://github.com/npm/cli/issues/7309.
    wslRootBinariesNeedingCopy: {
      nodePath: path.resolve(nodeRepositoryDir, 'node.exe'),
      chromedriverPath: path.resolve(
        bazelTestWorkingDir,
        `../org_chromium_chromedriver_windows/chromedriver_win32/chromedriver.exe`,
      ),
      chromiumPath: path.resolve(
        bazelTestWorkingDir,
        `../org_chromium_chromium_windows/chrome-win/chrome.exe`,
      ),
    },
    copiedWindowsBinaries: {
      nodePath: path.join(npmDir, 'node.exe'),
    },
  });
}

/**
 * Takes the given process environment and computes a `WSLENV` environment
 * variable value that allows for the process environment to be usable
 * within the Windows host environment (e.g. in `cmd.exe`).
 *
 * By default, WSL does not inherit process environment variables, unless
 * explicitly specified via the `WSLENV` variable; which is also smart enough
 * to automatically translate paths of environment variables from Unix to Windows.
 *
 * See: https://devblogs.microsoft.com/commandline/share-environment-vars-between-wsl-and-windows/
 */
export function createWslEnv(env: NodeJS.ProcessEnv): string {
  const result: string[] = [];

  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) {
      continue;
    }

    if (shouldInteropWslPath(value)) {
      // Forward as a path (transforming for non-WSL).
      result.push(`${key}/p`);
    } else if (key === 'PATH') {
      // Forward as a path list (transforming paths for non-WSL)
      result.push(`${key}/l`);
    } else {
      // Forward as a simple text variable.
      result.push(`${key}/w`);
    }
  }
  return result.join(':');
}

export function wslpath(...args: string[]): string {
  return child_process.execSync(`wslpath ${args.join(' ')}`, { encoding: 'utf8' }).trim();
}
