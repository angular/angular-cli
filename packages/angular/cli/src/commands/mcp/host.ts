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

import { existsSync as nodeExistsSync } from 'fs';
import { ChildProcess, spawn } from 'node:child_process';
import { Stats } from 'node:fs';
import { glob as nodeGlob, readFile as nodeReadFile, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';

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
  readFile(path: string, encoding: 'utf-8'): Promise<string>;

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
   * Resolves a module request from a given path.
   * @param request The module request to resolve.
   * @param from The path from which to resolve the request.
   * @returns The resolved module path.
   */
  resolveModule(request: string, from: string): string;

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
  ): Promise<{ logs: string[] }>;

  /**
   * Spawns a long-running child process and returns the `ChildProcess` object.
   * @param command The command to run.
   * @param args The arguments to pass to the command.
   * @param options Options for the child process.
   * @returns The spawned `ChildProcess` instance.
   */
  spawn(
    command: string,
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

  resolveModule(request: string, from: string): string {
    return createRequire(from).resolve(request);
  },

  runCommand: async (
    command: string,
    args: readonly string[],
    options: {
      timeout?: number;
      stdio?: 'pipe' | 'ignore';
      cwd?: string;
      env?: Record<string, string>;
    } = {},
  ): Promise<{ logs: string[] }> => {
    const signal = options.timeout ? AbortSignal.timeout(options.timeout) : undefined;

    return new Promise((resolve, reject) => {
      const childProcess = spawn(command, args, {
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
      childProcess.stdout?.on('data', (data) => logs.push(data.toString()));
      childProcess.stderr?.on('data', (data) => logs.push(data.toString()));

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

  spawn(
    command: string,
    args: readonly string[],
    options: {
      stdio?: 'pipe' | 'ignore';
      cwd?: string;
      env?: Record<string, string>;
    } = {},
  ): ChildProcess {
    return spawn(command, args, {
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
};
