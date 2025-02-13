import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import child_process from 'node:child_process';
import { getGlobalVariable } from './env';

interface WindowsWslTestMode {
  cmdPath: string;
  gitBinaryDirForWindows: string;
  nodeBinaryForWindowsPath: string;
  nodeBinaryForWindowsInsideWslPath: string;
  npmBinaryForWindowsPath: string;
  wslRootPath: string;
  wslUncBase: string;
}

export const windowsTmpDir = process.env['NG_E2E_RUNNER_WINDOWS_TMP_DIR'];

export function shouldInteropWslPath(p: string): boolean {
  return p.startsWith('/') && fs.existsSync(p);
}

export function interopWslPathForOutsideIfNecessary(p: string): string {
  const windowsMode = isWindowsTestMode();
  assert(windowsMode !== null);

  if (shouldInteropWslPath(p)) {
    return (
      child_process
        .execSync(`wslpath -w ${p}`, { encoding: 'utf8' })
        .trim()
        // Note: We expect a fake symlinked WSL root directory in our host's
        // main drive. This is necessary because `npm publish` does not work
        // with UNC paths, like `\\wsl.localhost\Debian\<..>`.
        .replace(windowsMode.wslUncBase, windowsMode.wslRootPath)
    );
  }
  return p;
}

export function isWindowsTestMode(): WindowsWslTestMode | null {
  const cmdEnv = process.env['NG_E2E_RUNNER_WINDOWS_CMD'];
  if (cmdEnv === undefined) {
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

  return {
    cmdPath: cmdEnv,
    gitBinaryDirForWindows: path.dirname(gitBinaryForWindows),
    // We will copy the Node version outside of WSL because NPM might
    // have problems executing with the UNC path. See:
    // https://github.com/npm/cli/issues/7309.
    nodeBinaryForWindowsPath: path.join(npmDir, 'node.exe'),
    nodeBinaryForWindowsInsideWslPath: path.resolve(nodeRepositoryDir, 'node.exe'),
    npmBinaryForWindowsPath: windowsNpmBin,
    wslRootPath,
    wslUncBase,
  };
}

/**
 *
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
