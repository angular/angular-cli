/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/**
 * @fileoverview
 * This file defines an abstraction layer for operating-system or file-system operations, such as
 * command execution. This allows for easier testing by enabling the injection of mock or
 * test-specific implementations.
 */

import { ChildProcess, spawn } from 'node:child_process';
import {
  Stats,
  lstatSync,
  existsSync as nodeExistsSync,
  readlinkSync,
  realpathSync,
} from 'node:fs';
import { glob as nodeGlob, readFile as nodeReadFile, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import { basename, dirname, isAbsolute, join, parse, relative, resolve, sep } from 'node:path';
import { createInterface } from 'node:readline';
import { stripVTControlCharacters } from 'node:util';

/**
 * An error thrown when a command fails to execute.
 */
export class CommandError extends Error {
  constructor(
    message: string,
    public readonly logs: string[],
    public readonly code: number | null,
  ) {
    super(message);
  }
}

/**
 * An abstraction layer for operating-system or file-system operations.
 */
export interface Host {
  /**
   * Gets the stats of a file or directory.
   * @param path The path to the file or directory.
   * @returns A promise that resolves to the stats.
   */
  stat(path: string): Promise<Stats>;

  /**
   * Checks if a path exists on the file system.
   * @param path The path to check.
   * @returns A boolean indicating whether the path exists.
   */
  existsSync(path: string): boolean;

  /**
   * Reads a file and returns its content.
   * @param path The path to the file.
   * @param encoding The encoding to use.
   * @returns A promise that resolves to the file content.
   */
  readFile(path: string, encoding: BufferEncoding): Promise<string>;

  /**
   * Finds files matching a glob pattern.
   * @param pattern The glob pattern.
   * @param options Options for the glob search.
   * @returns An async iterable of file entries.
   */
  glob(
    pattern: string,
    options: { cwd: string },
  ): AsyncIterable<{ name: string; parentPath: string; isFile(): boolean }>;

  /**
   * Spawns a child process and returns a promise that resolves with the process's
   * output or rejects with a structured error.
   * @param args The arguments to pass to the command.
   * @param options Options for the child process.
   * @returns A promise that resolves with the standard output and standard error of the command.
   */
  executeNgCommand(
    args: readonly string[],
    options?: {
      timeout?: number;
      stdio?: 'pipe' | 'ignore';
      cwd?: string;
      env?: Record<string, string>;
    },
  ): Promise<{ logs: string[] }>;

  /**
   * Spawns a long-running child process and returns the `ChildProcess` object.
   * @param args The arguments to pass to the command.
   * @param options Options for the child process.
   * @returns The spawned `ChildProcess` instance.
   */
  startNgProcess(
    args: readonly string[],
    options?: {
      stdio?: 'pipe' | 'ignore';
      cwd?: string;
      env?: Record<string, string>;
    },
  ): ChildProcess;

  /**
   * Finds an available TCP port on the system.
   */
  getAvailablePort(): Promise<number>;

  /**
   * Checks whether a TCP port is available on the system.
   */
  isPortAvailable(port: number): Promise<boolean>;

  /**
   * Sets the allowed roots for this host.
   */
  setRoots(roots: string[]): void;
}

function resolveNgCommand(
  args: readonly string[],
  cwd?: string,
): { command: string; args: readonly string[] } {
  const defaultCommand = { command: 'ng', args };
  if (!cwd) {
    return defaultCommand;
  }

  try {
    const workspaceRequire = createRequire(join(cwd, 'package.json'));
    const pkgJsonPath = workspaceRequire.resolve('@angular/cli/package.json');
    const pkgJson = workspaceRequire(pkgJsonPath) as { bin?: string | Record<string, string> };
    const binPath = typeof pkgJson.bin === 'string' ? pkgJson.bin : pkgJson.bin?.['ng'];

    if (binPath) {
      const ngJsPath = resolve(dirname(pkgJsonPath), binPath);

      return {
        command: process.execPath,
        args: [ngJsPath, ...args],
      };
    }
  } catch {
    // Failed to resolve the CLI binary, fall back to assuming `ng` is on PATH.
  }

  return defaultCommand;
}

/**
 * A concrete implementation of the `Host` interface that runs on a local workspace.
 */
export const LocalWorkspaceHost: Host = {
  stat,

  existsSync: nodeExistsSync,

  readFile: nodeReadFile,

  glob: function (
    pattern: string,
    options: { cwd: string },
  ): AsyncIterable<{ name: string; parentPath: string; isFile(): boolean }> {
    return nodeGlob(pattern, { ...options, withFileTypes: true });
  },

  executeNgCommand: async (
    args: readonly string[],
    options: {
      timeout?: number;
      stdio?: 'pipe' | 'ignore';
      cwd?: string;
      env?: Record<string, string>;
    } = {},
  ): Promise<{ logs: string[] }> => {
    const resolved = resolveNgCommand(args, options.cwd);
    const signal = options.timeout ? AbortSignal.timeout(options.timeout) : undefined;

    return new Promise((resolve, reject) => {
      const childProcess = spawn(resolved.command, resolved.args, {
        shell: false,
        stdio: options.stdio ?? 'pipe',
        signal,
        cwd: options.cwd,
        env: {
          ...process.env,
          ...options.env,
        },
      });

      const logs: string[] = [];
      processStreamLines(childProcess.stdout, (line) => logs.push(line));
      processStreamLines(childProcess.stderr, (line) => logs.push(line));

      childProcess.on('close', (code) => {
        if (code === 0) {
          resolve({ logs });
        } else {
          const message = `Process exited with code ${code}.`;
          reject(new CommandError(message, logs, code));
        }
      });

      childProcess.on('error', (err) => {
        if (err.name === 'AbortError') {
          const message = `Process timed out.`;
          reject(new CommandError(message, logs, null));

          return;
        }
        const message = `Process failed with error: ${err.message}`;
        reject(new CommandError(message, logs, null));
      });
    });
  },

  startNgProcess(
    args: readonly string[],
    options: {
      stdio?: 'pipe' | 'ignore';
      cwd?: string;
      env?: Record<string, string>;
    } = {},
  ): ChildProcess {
    const resolved = resolveNgCommand(args, options.cwd);

    return spawn(resolved.command, resolved.args, {
      shell: false,
      stdio: options.stdio ?? 'pipe',
      cwd: options.cwd,
      env: {
        ...process.env,
        ...options.env,
      },
    });
  },

  getAvailablePort(): Promise<number> {
    return new Promise((resolve, reject) => {
      // Create a new temporary server from Node's net library.
      const server = createServer();

      server.once('error', (err: unknown) => {
        reject(err);
      });

      // Listen on port 0 to let the OS assign an available port.
      server.listen(0, () => {
        const address = server.address();

        // Ensure address is an object with a port property.
        if (address && typeof address === 'object') {
          const port = address.port;

          server.close();
          resolve(port);
        } else {
          reject(new Error('Unable to retrieve address information from server.'));
        }
      });
    });
  },

  isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = createServer();
      server.once('error', () => resolve(false));
      server.listen(port, () => {
        server.close(() => {
          resolve(true);
        });
      });
    });
  },

  setRoots(roots: string[]) {
    // LocalWorkspaceHost does not enforce roots, so this is a no-op.
  },
};

const MAX_SYMLINK_DEPTH = 40;
const MAX_RUNNER_ARGS_DEPTH = 4;
const PATH_SEPARATOR_PATTERN = sep === '\\' ? /[\\/]+/ : /\/+/;
const DOT_DOT_SEGMENT_PATTERN =
  sep === '\\' ? /(?:^|[\\/])\.\.(?:[\\/]|$)/ : /(?:^|\/)\.\.(?:\/|$)/;

/**
 * Normalized option names (lowercase, without hyphens/underscores) that represent non-filesystem
 * values such as URL paths, booleans, enums, or Architect targets.
 */
const NON_PATH_OPTIONS = new Set([
  'basehref',
  'browsertarget',
  'browserviewport',
  'browsers',
  'buildtarget',
  'configuration',
  'deleteoutputpath',
  'deployurl',
  'dumpvirtualfiles',
  'filter',
  'host',
  'outputhashing',
  'outputmode',
  'publichost',
  'route',
  'routes',
  'runner',
  'servepath',
  'servertarget',
]);

/**
 * Normalized option names representing output directories that builders may clean recursively
 * before writing output files.
 */
const OUTPUT_DIR_OPTIONS = new Set([
  'dest',
  'destination',
  'outdir',
  'outpath',
  'outputdir',
  'outputdirectory',
  'outputpath',
]);

/**
 * Normalized option names resolved relative to the effective output directory and workspace root.
 */
const OUTPUT_RELATIVE_OPTIONS = new Set(['outfile', 'resourcesoutputpath']);

/**
 * Normalized option names that accept filesystem paths.
 */
const EXACT_PATH_OPTIONS = new Set([
  'appmodulebundle',
  'assets',
  'browser',
  'cachelocation',
  'config',
  'configdir',
  'configfile',
  'coveragedir',
  'coveragedirectory',
  'eslintconfig',
  'filereplacements',
  'index',
  'inputindexpath',
  'karmaconfig',
  'main',
  'ngswconfigpath',
  'out',
  'outputfile',
  'outputindexpath',
  'polyfills',
  'project',
  'providersfile',
  'proxyconfig',
  'routesfile',
  'runnerconfig',
  'scripts',
  'server',
  'serviceworker',
  'setupfiles',
  'sslcert',
  'sslkey',
  'styles',
  'tsconfig',
  'webpackconfig',
  'webworkertsconfig',
]);

/**
 * Normalized option names that accept glob patterns.
 */
const GLOB_PATH_OPTIONS = new Set([
  'codecoverageexclude',
  'coverageexclude',
  'coverageinclude',
  'exclude',
  'include',
  'lintfilepatterns',
]);

/**
 * Normalized option names whose schema allows both boolean literals (`true`/`false`) and file paths.
 */
const BOOLEAN_OR_PATH_OPTIONS = new Set(['index', 'runnerconfig', 'server', 'serviceworker']);

/**
 * Word-boundary suffix tokens used to identify custom/third-party builder path options
 * (e.g., `--eslint-config`, `--output-dir`, `--report-file`, `--cache-location`).
 */
const PATH_OPTION_SUFFIX_TOKENS = new Set([
  'config',
  'dest',
  'destination',
  'dir',
  'directory',
  'dirs',
  'file',
  'files',
  'location',
  'path',
  'paths',
  'root',
]);

type OptionPathKind = 'none' | 'path' | 'output-dir' | 'output-relative' | 'glob' | 'runner-args';

function normalizeOptionKey(key: string): string {
  return key.toLowerCase().replace(/[-_]/g, '');
}

function getOptionKeyTokens(key: string): string[] {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase()
    .split(/[-_]+/)
    .filter(Boolean);
}

function stripNegationPrefix(segment: string): string {
  return segment.toLowerCase().startsWith('no-') ? segment.slice(3) : segment;
}

function classifySingleKey(rawSegment: string): OptionPathKind {
  const segment = stripNegationPrefix(rawSegment);
  const compact = normalizeOptionKey(segment);

  if (!compact || NON_PATH_OPTIONS.has(compact)) {
    return 'none';
  }
  if (compact === 'runnerargs') {
    return 'runner-args';
  }
  if (OUTPUT_DIR_OPTIONS.has(compact)) {
    return 'output-dir';
  }
  if (OUTPUT_RELATIVE_OPTIONS.has(compact)) {
    return 'output-relative';
  }
  if (GLOB_PATH_OPTIONS.has(compact)) {
    return 'glob';
  }
  if (EXACT_PATH_OPTIONS.has(compact) || compact === 'o') {
    return 'path';
  }

  const lastToken = getOptionKeyTokens(segment).at(-1);
  if (lastToken && PATH_OPTION_SUFFIX_TOKENS.has(lastToken)) {
    return 'path';
  }

  return 'none';
}

function classifyOptionKey(rawKey: string): OptionPathKind {
  const dotSegments = rawKey.split('.');
  if (dotSegments.length === 1) {
    return classifySingleKey(dotSegments[0]);
  }

  const rootKind = classifySingleKey(dotSegments[0]);
  const leafSegment = dotSegments.at(-1) ?? '';
  const leafCompact = normalizeOptionKey(leafSegment);

  if (rootKind === 'output-dir') {
    return leafCompact === 'base' ? 'output-dir' : 'output-relative';
  }

  const leafKind = classifySingleKey(leafSegment);
  if (leafKind !== 'none') {
    return leafKind;
  }

  if (
    rootKind !== 'none' ||
    leafCompact === 'entry' ||
    leafCompact === 'input' ||
    leafCompact === 'output'
  ) {
    return leafCompact === 'output' && normalizeOptionKey(dotSegments[0]) === 'index'
      ? 'output-relative'
      : 'path';
  }

  return 'none';
}

function isPathWithinRoot(root: string, targetPath: string): boolean {
  const rel = relative(root, targetPath);

  return rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

/**
 * Resolves a path to its canonical real path, preserving trailing non-existent segments and
 * following symlinks (including dangling symlinks) so targets outside allowed roots cannot bypass
 * confinement.
 */
function resolveRealPath(targetPath: string, depth = 0): string {
  if (targetPath.includes('\0')) {
    throw new Error('Access denied: path contains a null byte.');
  }
  if (depth > MAX_SYMLINK_DEPTH) {
    throw new Error(
      `Access denied: too many symbolic links encountered resolving '${targetPath}'.`,
    );
  }

  const resolvedPath = resolve(targetPath);
  try {
    return realpathSync(resolvedPath);
  } catch (e) {
    if ((e as Error & { code?: string }).code !== 'ENOENT') {
      throw e;
    }
  }

  const missingSegments: string[] = [];
  let current = resolvedPath;

  while (true) {
    try {
      const entryStats = lstatSync(current);
      if (entryStats.isSymbolicLink()) {
        const linkTarget = readlinkSync(current);
        const parentDir = realpathSync(dirname(current));
        const resolvedLink = resolveRealPath(resolve(parentDir, linkTarget), depth + 1);

        return join(resolvedLink, ...missingSegments);
      }

      return join(realpathSync(current), ...missingSegments);
    } catch (e) {
      if ((e as Error & { code?: string }).code !== 'ENOENT') {
        throw e;
      }

      const parent = dirname(current);
      if (parent === current) {
        return resolvedPath;
      }

      missingSegments.unshift(basename(current));
      current = parent;
    }
  }
}

/**
 * Walks an un-normalized path resolving intermediate symlinks BEFORE collapsing `..` segments,
 * matching OS-level path resolution (e.g. catching `symlink/../secret` escaping via `symlink`).
 */
function resolvePathFollowingSymlinks(rawPath: string, realBaseDir: string): string {
  let current: string;
  let remainder: string;

  if (isAbsolute(rawPath)) {
    const parsedRoot = parse(rawPath).root;
    current = parsedRoot;
    remainder = rawPath.slice(parsedRoot.length);
  } else {
    current = realBaseDir;
    remainder = rawPath;
  }

  const segments = remainder.split(PATH_SEPARATOR_PATTERN);
  for (const segment of segments) {
    if (!segment || segment === '.') {
      continue;
    }
    if (segment === '..') {
      current = dirname(current);
      continue;
    }

    current = join(current, segment);
    try {
      if (lstatSync(current).isSymbolicLink()) {
        current = resolveRealPath(current);
      }
    } catch (e) {
      if ((e as Error & { code?: string }).code !== 'ENOENT') {
        throw e;
      }
    }
  }

  return resolveRealPath(current);
}

function resolveRoots(roots: string[]): string[] {
  return roots.map((r) => {
    try {
      return resolveRealPath(r);
    } catch {
      return resolve(r);
    }
  });
}

function isAllowedRealPath(roots: readonly string[], realPath: string): boolean {
  return roots.some((root) => isPathWithinRoot(root, realPath));
}

function assertRealPathAllowed(
  roots: readonly string[],
  targetPath: string,
  errorLabel?: string,
): string {
  const realPath = resolveRealPath(targetPath);

  if (!isAllowedRealPath(roots, realPath)) {
    if (errorLabel) {
      throw new Error(`Access denied: ${errorLabel} is outside allowed roots.`);
    }

    throw new Error(`Access denied: path '${targetPath}' is outside allowed roots.`);
  }

  return realPath;
}

function validateOptionPathValue(
  roots: readonly string[],
  flag: string,
  rawValue: string,
  baseDir: string,
  realBaseDir: string,
): { realPath: string; walkedPath: string | undefined } {
  if (rawValue.includes('\0')) {
    throw new Error(`Access denied: option '${flag}' contains a null byte.`);
  }

  const label = `option '${flag}' path '${rawValue}'`;
  const realPath = assertRealPathAllowed(roots, resolve(baseDir, rawValue), label);

  let walkedPath: string | undefined;
  if (DOT_DOT_SEGMENT_PATTERN.test(rawValue)) {
    walkedPath = resolvePathFollowingSymlinks(rawValue, realBaseDir);
    if (!isAllowedRealPath(roots, walkedPath)) {
      throw new Error(`Access denied: ${label} is outside allowed roots.`);
    }
  }

  return { realPath, walkedPath };
}

function assertNotWorkspaceOrRootAncestor(
  roots: readonly string[],
  flag: string,
  rawValue: string,
  candidatePath: string,
  realCwd: string,
): void {
  if (isPathWithinRoot(candidatePath, realCwd)) {
    throw new Error(
      `Access denied: option '${flag}' path '${rawValue}' must not be the workspace directory ` +
        'or a parent of it.',
    );
  }

  if (roots.some((root) => isPathWithinRoot(candidatePath, root))) {
    throw new Error(
      `Access denied: option '${flag}' path '${rawValue}' must not be an allowed root directory ` +
        'or a parent of it.',
    );
  }
}

function validateGlobOptionValue(
  roots: readonly string[],
  flag: string,
  pattern: string,
  cwd: string,
  realCwd: string,
): void {
  if (pattern.includes('\0')) {
    throw new Error(`Access denied: option '${flag}' contains a null byte.`);
  }

  const normalized = pattern.startsWith('!') ? pattern.slice(1) : pattern;
  if (!normalized) {
    return;
  }

  const label = `option '${flag}' pattern '${pattern}'`;
  const firstWildcardIndex = normalized.search(/[*?[{]/);
  const basePath = firstWildcardIndex >= 0 ? normalized.slice(0, firstWildcardIndex) : normalized;

  if (firstWildcardIndex >= 0) {
    const wildcardTail = normalized.slice(firstWildcardIndex);
    if (/(?:^|[\\/{,])\.\.(?:[\\/},]|$)/.test(wildcardTail)) {
      throw new Error(`Access denied: ${label} contains path traversal sequences.`);
    }

    if (normalized.startsWith('{')) {
      let braceDepth = 0;
      let braceCloseIndex = normalized.length;
      for (let i = 0; i < normalized.length; i++) {
        if (normalized[i] === '{') {
          braceDepth++;
        } else if (normalized[i] === '}') {
          braceDepth--;
          if (braceDepth === 0) {
            braceCloseIndex = i;
            break;
          }
        }
      }

      const braceContent = normalized.slice(1, braceCloseIndex);
      for (const token of braceContent.split(/[{},]/)) {
        if (!token) {
          continue;
        }
        const tokenWildcard = token.search(/[*?[]/);
        const tokenBase = tokenWildcard >= 0 ? token.slice(0, tokenWildcard) : token;
        if (tokenBase) {
          assertRealPathAllowed(roots, resolve(cwd, tokenBase), label);
        }
      }
    }
  }

  assertRealPathAllowed(roots, resolve(cwd, basePath), label);
  if (DOT_DOT_SEGMENT_PATTERN.test(basePath)) {
    const walkedBase = resolvePathFollowingSymlinks(basePath, realCwd);
    if (!isAllowedRealPath(roots, walkedBase)) {
      throw new Error(`Access denied: ${label} is outside allowed roots.`);
    }
  }
}

function validateNgCommandArgs(
  roots: readonly string[],
  args: readonly string[],
  cwd: string,
  realCwd: string,
  depth = 0,
): void {
  if (depth > MAX_RUNNER_ARGS_DEPTH) {
    throw new Error('Access denied: nested runner argument depth exceeded.');
  }

  const outputDirs: Array<{ raw: string; real: string }> = [];
  const outputRelativeChecks: Array<{ flag: string; value: string }> = [];
  const nestedRunnerArgs: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg.startsWith('-') || arg === '-' || arg === '--') {
      continue;
    }

    const withoutPrefix = arg.startsWith('--') ? arg.slice(2) : arg.slice(1);
    const eqIndex = withoutPrefix.indexOf('=');
    const hasEquals = eqIndex !== -1;
    const rawKey = hasEquals ? withoutPrefix.slice(0, eqIndex) : withoutPrefix;
    const kind = classifyOptionKey(rawKey);
    if (kind === 'none') {
      continue;
    }

    const flag = arg.startsWith('--') ? `--${rawKey}` : `-${rawKey}`;
    const isNegated = rawKey.toLowerCase().startsWith('no-');

    let value: string | undefined;
    if (hasEquals) {
      value = withoutPrefix.slice(eqIndex + 1);
    } else if (!isNegated && i + 1 < args.length && !args[i + 1].startsWith('-')) {
      value = args[++i];
    }

    if (kind === 'runner-args') {
      if (value !== undefined) {
        nestedRunnerArgs.push(value);
      }
      continue;
    }

    if (kind === 'output-dir') {
      if (isNegated && !hasEquals) {
        continue;
      }
      const rawDir = value ?? '';
      const { realPath, walkedPath } = validateOptionPathValue(roots, flag, rawDir, cwd, realCwd);
      assertNotWorkspaceOrRootAncestor(roots, flag, rawDir, realPath, realCwd);
      if (walkedPath) {
        assertNotWorkspaceOrRootAncestor(roots, flag, rawDir, walkedPath, realCwd);
      }
      outputDirs.push({ raw: resolve(cwd, rawDir), real: realPath });
      continue;
    }

    if (value === undefined) {
      continue;
    }

    const compactKey = normalizeOptionKey(stripNegationPrefix(rawKey));
    if (
      BOOLEAN_OR_PATH_OPTIONS.has(compactKey) &&
      (value === 'true' || value === 'false' || value === '')
    ) {
      continue;
    }

    if (kind === 'glob') {
      validateGlobOptionValue(roots, flag, value, cwd, realCwd);
    } else if (kind === 'output-relative') {
      validateOptionPathValue(roots, flag, value, cwd, realCwd);
      outputRelativeChecks.push({ flag, value });
    } else {
      validateOptionPathValue(roots, flag, value, cwd, realCwd);
    }
  }

  for (const { flag, value } of outputRelativeChecks) {
    for (const outputDir of outputDirs) {
      validateOptionPathValue(roots, flag, value, outputDir.raw, outputDir.real);
    }
  }

  if (nestedRunnerArgs.length > 0) {
    validateNgCommandArgs(roots, nestedRunnerArgs, cwd, realCwd, depth + 1);
  }
}

export function createRootRestrictedHost(
  baseHost: Host,
  initialRoots: string[] = [process.cwd()],
): Host {
  const defaultRoots = resolveRoots(initialRoots);
  let roots = defaultRoots;

  function checkPath(path: string): string {
    return assertRealPathAllowed(roots, path);
  }

  return {
    ...baseHost,
    setRoots(newRoots: string[]) {
      roots = newRoots.length > 0 ? resolveRoots(newRoots) : defaultRoots;
    },
    stat(path: string) {
      checkPath(path);

      return baseHost.stat(path);
    },
    existsSync(path: string) {
      checkPath(path);

      return baseHost.existsSync(path);
    },
    readFile(path: string, encoding: BufferEncoding) {
      checkPath(path);

      return baseHost.readFile(path, encoding);
    },
    glob(pattern: string, options: { cwd: string }) {
      if (pattern.includes('..')) {
        throw new Error(
          `Access denied: glob pattern '${pattern}' contains path traversal sequences.`,
        );
      }

      checkPath(options.cwd);

      const firstWildcardIndex = pattern.search(/[*?[{]/);
      const basePath = firstWildcardIndex >= 0 ? pattern.substring(0, firstWildcardIndex) : pattern;

      const targetDir = resolve(options.cwd, basePath);
      checkPath(targetDir);

      return baseHost.glob(pattern, options);
    },
    executeNgCommand(
      args: readonly string[],
      options: Parameters<Host['executeNgCommand']>[1] = {},
    ) {
      const effectiveCwd = options?.cwd ?? process.cwd();
      const realCwd = checkPath(effectiveCwd);
      validateNgCommandArgs(roots, args, effectiveCwd, realCwd);

      return baseHost.executeNgCommand(args, options);
    },
    startNgProcess(args: readonly string[], options: Parameters<Host['startNgProcess']>[1] = {}) {
      const effectiveCwd = options?.cwd ?? process.cwd();
      const realCwd = checkPath(effectiveCwd);
      validateNgCommandArgs(roots, args, effectiveCwd, realCwd);

      return baseHost.startNgProcess(args, options);
    },
  };
}

/**
 * Binds a readline interface to the given stream to process each line.
 * Sanitizes lines by removing VT/ANSI control characters, trimming trailing whitespace,
 * and preserving leading indentation.
 */
export function processStreamLines(
  stream: NodeJS.ReadableStream | undefined | null,
  lineCallback: (line: string) => void,
): void {
  if (!stream) {
    return;
  }

  const rl = createInterface({ input: stream, terminal: false });
  rl.on('line', (line) => {
    const cleanLine = stripVTControlCharacters(line).trimEnd();
    if (cleanLine.length > 0) {
      lineCallback(cleanLine);
    }
  });
}
