/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
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
      const data = await host.read(normalize(path)).toPromise();

      return virtualFs.fileBufferToString(data);
    },
    async writeFile(path: string, data: string): Promise<void> {
      return host.write(normalize(path), virtualFs.stringToFileBuffer(data)).toPromise();
    },
    async isDirectory(path: string): Promise<boolean> {
      try {
        return await host.isDirectory(normalize(path)).toPromise();
      } catch {
        // some hosts throw if path does not exist
        return false;
      }
    },
    async isFile(path: string): Promise<boolean> {
      try {
        return await host.isFile(normalize(path)).toPromise();
      } catch {
        // some hosts throw if path does not exist
        return false;
      }
    },
  };

  return workspaceHost;
}
