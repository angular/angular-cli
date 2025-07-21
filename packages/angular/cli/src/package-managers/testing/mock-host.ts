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
  private readonly fs = new Map<string, string[] | true>();

  constructor(files: Record<string, string[] | true> = {}) {
    // Normalize paths to use forward slashes for consistency in tests.
    for (const [path, content] of Object.entries(files)) {
      this.fs.set(path.replace(/\\/g, '/'), content);
    }
  }

  stat(path: string): Promise<Stats> {
    const content = this.fs.get(path.replace(/\\/g, '/'));
    if (content === undefined) {
      return Promise.reject(new Error(`File not found: ${path}`));
    }

    // A `true` value signifies a directory in our mock file system.
    return Promise.resolve({ isDirectory: () => content === true } as Stats);
  }

  readdir(path: string): Promise<string[]> {
    const content = this.fs.get(path.replace(/\\/g, '/'));
    if (content === true || content === undefined) {
      // This should be a directory with a file list.
      return Promise.reject(new Error(`Directory not found or not a directory: ${path}`));
    }

    return Promise.resolve(content);
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
}
