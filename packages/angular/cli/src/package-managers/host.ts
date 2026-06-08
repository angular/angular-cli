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
        shell: isWin32,
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
      const childProcess = isWin32
        ? spawn(`${command} ${args.join(' ')}`, spawnOptions)
        : spawn(command, args, spawnOptions);

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
