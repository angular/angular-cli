/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/**
 * @fileoverview
 * This file defines an abstraction layer for side-effectful operations, such as
 * file system access and command execution. This allows for easier testing by
 * enabling the injection of mock or test-specific implementations.
 */

import { type SpawnOptions, spawn } from 'node:child_process';
import { Stats, constants } from 'node:fs';
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { platform, tmpdir } from 'node:os';
import { join } from 'node:path';
import { PackageManagerError } from './error';

// cmd.exe metacharacters that need ^ escaping.
// Reference: http://www.robvanderwoude.com/escapechars.php
const metaCharsRegExp = /([()\][%!^"`<>&|;, *?])/g;

/** Escapes a command name for safe use in cmd.exe. */
function escapeCommandForCmd(cmd: string): string {
  return cmd.replace(metaCharsRegExp, '^$1');
}

/**
 * Escapes an argument for safe use in cmd.exe.
 * Adapted from cross-spawn's `lib/util/escape.js`:
 * https://github.com/moxystudio/node-cross-spawn/blob/master/lib/util/escape.js
 *
 * Algorithm based on https://learn.microsoft.com/en-us/archive/blogs/twistylittlepassagesallalike/everyone-quotes-command-line-arguments-the-wrong-way
 */
function escapeArgForCmd(arg: string): string {
  const processed = arg
    // Sequence of backslashes followed by a double quote:
    // double up all the backslashes and escape the double quote
    .replace(/(?=(\\+?)?)\1"/g, '$1$1\\"')
    // Sequence of backslashes followed by the end of the string
    // (which will become a double quote later):
    // double up all the backslashes
    .replace(/(?=(\\+?)?)\1$/, '$1$1');

  // Quote the whole thing and escape cmd.exe meta chars with ^
  return `"${processed}"`.replace(metaCharsRegExp, '^$1');
}

/**
 * An abstraction layer for side-effectful operations.
 */
export interface Host {
  /**
   * Whether shell quoting is required for package manager specifiers.
   * This is typically true on Windows, where commands are executed in a shell.
   */
  readonly requiresQuoting?: boolean;

  /**
   * Creates a directory.
   * @param path The path to the directory.
   * @param options Options for the directory creation.
   * @returns A promise that resolves when the directory is created.
   */
  mkdir(path: string, options?: { recursive?: boolean }): Promise<string | undefined>;

  /**
   * Gets the stats of a file or directory.
   * @param path The path to the file or directory.
   * @returns A promise that resolves to the stats.
   */
  stat(path: string): Promise<Stats>;

  /**
   * Reads the content of a file.
   * @param path The path to the file.
   * @returns A promise that resolves to the file content as a string.
   */
  readFile(path: string): Promise<string>;

  /**
   * Copies a file from the source path to the destination path.
   * @param src The path to the source file.
   * @param dest The path to the destination file.
   * @returns A promise that resolves when the copy is complete.
   */
  copyFile(src: string, dest: string): Promise<void>;

  /**
   * Creates a new, unique temporary directory.
   * @param baseDir The base directory in which to create the temporary directory.
   * @returns A promise that resolves to the absolute path of the created directory.
   */
  createTempDirectory(baseDir?: string): Promise<string>;

  /**
   * Deletes a directory recursively.
   * @param path The path to the directory to delete.
   * @returns A promise that resolves when the deletion is complete.
   */
  deleteDirectory(path: string): Promise<void>;

  /**
   * Writes content to a file.
   * @param path The path to the file.
   * @param content The content to write.
   * @returns A promise that resolves when the write is complete.
   */
  writeFile(path: string, content: string): Promise<void>;

  /**
   * Spawns a child process and returns a promise that resolves with the process's
   * output or rejects with a structured error.
   * @param command The command to run.
   * @param args The arguments to pass to the command.
   * @param options Options for the child process.
   * @returns A promise that resolves with the standard output and standard error of the command.
   */
  runCommand(
    command: string,
    args: readonly string[],
    options?: {
      timeout?: number;
      stdio?: 'pipe' | 'ignore';
      cwd?: string;
      env?: Record<string, string>;
    },
  ): Promise<{ stdout: string; stderr: string }>;
}

/**
 * A concrete implementation of the `Host` interface that uses the Node.js APIs.
 */
export const NodeJS_HOST: Host = {
  stat,
  requiresQuoting: platform() === 'win32',
  mkdir,
  readFile: (path: string) => readFile(path, { encoding: 'utf8' }),
  copyFile: (src, dest) => copyFile(src, dest, constants.COPYFILE_FICLONE),
  writeFile,
  createTempDirectory: (baseDir?: string) =>
    mkdtemp(join(baseDir ?? tmpdir(), 'angular-cli-tmp-packages-')),
  deleteDirectory: (path: string) => rm(path, { recursive: true, force: true }),
  runCommand: async (
    command: string,
    args: readonly string[],
    options: {
      timeout?: number;
      stdio?: 'pipe' | 'ignore';
      cwd?: string;
      env?: Record<string, string>;
    } = {},
  ): Promise<{ stdout: string; stderr: string }> => {
    const signal = options.timeout ? AbortSignal.timeout(options.timeout) : undefined;
    const isWin32 = platform() === 'win32';

    return new Promise((resolve, reject) => {
      const spawnOptions = {
        stdio: options.stdio ?? 'pipe',
        signal,
        cwd: options.cwd,
        env: {
          ...process.env,
          ...options.env,
          //  NPM updater notifier will prevents the child process from closing until it timeout after 3 minutes.
          NO_UPDATE_NOTIFIER: '1',
          NPM_CONFIG_UPDATE_NOTIFIER: 'false',
        },
      } satisfies SpawnOptions;

      let childProcess;
      if (isWin32) {
        // On Windows, package managers (npm, yarn, pnpm) are .cmd scripts that
        // require a shell to execute. Instead of using shell: true (which is
        // vulnerable to command injection), we invoke cmd.exe directly with
        // properly escaped arguments.
        // This approach is based on cross-spawn:
        // https://github.com/moxystudio/node-cross-spawn
        const escapedCmd = escapeCommandForCmd(command);
        const escapedArgs = args.map((a) => escapeArgForCmd(a));
        const shellCommand = [escapedCmd, ...escapedArgs].join(' ');

        childProcess = spawn(
          process.env.comspec || 'cmd.exe',
          ['/d', '/s', '/c', `"${shellCommand}"`],
          { ...spawnOptions, windowsVerbatimArguments: true },
        );
      } else {
        childProcess = spawn(command, args, spawnOptions);
      }

      let stdout = '';
      childProcess.stdout?.on('data', (data) => (stdout += data.toString()));

      let stderr = '';
      childProcess.stderr?.on('data', (data) => (stderr += data.toString()));

      childProcess.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          const message = `Process exited with code ${code}.`;
          reject(new PackageManagerError(message, stdout, stderr, code));
        }
      });

      childProcess.on('error', (err) => {
        if (err.name === 'AbortError') {
          const message = `Process timed out.`;
          reject(new PackageManagerError(message, stdout, stderr, null));

          return;
        }
        const message = `Process failed with error: ${err.message}`;
        reject(new PackageManagerError(message, stdout, stderr, null));
      });
    });
  },
};
