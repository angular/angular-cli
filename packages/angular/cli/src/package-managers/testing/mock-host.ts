/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { Stats } from 'node:fs';
import { Host } from '../host';

/**
 * A mock `Host` implementation for testing.
 * This class allows for simulating a file system in memory.
 */
export class MockHost implements Host {
  readonly requiresQuoting = false;
  private readonly fs = new Map<string, string[] | true>();

  constructor(files: Record<string, string[] | true> = {}) {
    // Normalize paths to use forward slashes for consistency in tests.
    for (const [path, content] of Object.entries(files)) {
      const normalizedPath = path.replace(/\\/g, '/');
      this.fs.set(normalizedPath, content);

      // If the content is an array (directory listing), create entries for the files in it.
      if (Array.isArray(content)) {
        for (const file of content) {
          const filePath = normalizedPath === '/' ? `/${file}` : `${normalizedPath}/${file}`;
          this.fs.set(filePath, []); // Use empty array to represent a file (not `true` which is a dir)
        }
      }
    }
  }

  mkdir(path: string, options?: { recursive?: boolean }): Promise<string | undefined> {
    throw new Error('Method not implemented.');
  }

  stat(path: string): Promise<Stats> {
    const content = this.fs.get(path.replace(/\\/g, '/'));
    if (content === undefined) {
      return Promise.reject(new Error(`File not found: ${path}`));
    }

    // A `true` value signifies a directory in our mock file system.
    // Anything else is considered a file for the purpose of this mock.
    return Promise.resolve({
      isDirectory: () => content === true,
      isFile: () => content !== true,
    } as Stats);
  }

  runCommand(): Promise<{ stdout: string; stderr: string }> {
    throw new Error('Method not implemented.');
  }

  createTempDirectory(): Promise<string> {
    throw new Error('Method not implemented.');
  }

  deleteDirectory(): Promise<void> {
    throw new Error('Method not implemented.');
  }

  writeFile(): Promise<void> {
    throw new Error('Method not implemented.');
  }

  readFile(): Promise<string> {
    throw new Error('Method not implemented.');
  }

  copyFile(): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
