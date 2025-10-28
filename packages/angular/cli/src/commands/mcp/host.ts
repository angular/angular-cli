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
import { spawn } from 'node:child_process';
import { Stats } from 'node:fs';
import { stat } from 'node:fs/promises';

/**
 * An error thrown when a command fails to execute.
 */
export class CommandError extends Error {
  constructor(
    message: string,
    public readonly stdout: string,
    public readonly stderr: string,
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
 * A concrete implementation of the `Host` interface that runs on a local workspace.
 */
export const LocalWorkspaceHost: Host = {
  stat,
  existsSync: nodeExistsSync,
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

      let stdout = '';
      childProcess.stdout?.on('data', (data) => (stdout += data.toString()));

      let stderr = '';
      childProcess.stderr?.on('data', (data) => (stderr += data.toString()));

      childProcess.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          const message = `Process exited with code ${code}.`;
          reject(new CommandError(message, stdout, stderr, code));
        }
      });

      childProcess.on('error', (err) => {
        if (err.name === 'AbortError') {
          const message = `Process timed out.`;
          reject(new CommandError(message, stdout, stderr, null));

          return;
        }
        const message = `Process failed with error: ${err.message}`;
        reject(new CommandError(message, stdout, stderr, null));
      });
    });
  },
};
