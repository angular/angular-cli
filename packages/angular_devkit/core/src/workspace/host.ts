/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { lastValueFrom } from 'rxjs';
import { normalize, virtualFs } from '../virtual-fs';

export interface WorkspaceHost {
  readFile(path: string): Promise<string>;
  writeFile(path: string, data: string): Promise<void>;

  isDirectory(path: string): Promise<boolean>;
  isFile(path: string): Promise<boolean>;

  // Potential future additions
  // readDirectory?(path: string): Promise<string[]>;
}

export function createWorkspaceHost(host: virtualFs.Host): WorkspaceHost {
  const workspaceHost: WorkspaceHost = {
    async readFile(path: string): Promise<string> {
      const data = await lastValueFrom(host.read(normalize(path)));

      return virtualFs.fileBufferToString(data);
    },
    async writeFile(path: string, data: string): Promise<void> {
      return lastValueFrom(host.write(normalize(path), virtualFs.stringToFileBuffer(data)));
    },
    async isDirectory(path: string): Promise<boolean> {
      try {
        return await lastValueFrom(host.isDirectory(normalize(path)));
      } catch {
        // some hosts throw if path does not exist
        return false;
      }
    },
    async isFile(path: string): Promise<boolean> {
      try {
        return await lastValueFrom(host.isFile(normalize(path)));
      } catch {
        // some hosts throw if path does not exist
        return false;
      }
    },
  };

  return workspaceHost;
}
