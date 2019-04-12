/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { basename, getSystemPath, join, normalize } from '../virtual-fs';
import { WorkspaceDefinition } from './definitions';
import { WorkspaceHost } from './host';
import { readJsonWorkspace } from './json/reader';
import { writeJsonWorkspace } from './json/writer';

const formatLookup = new WeakMap<WorkspaceDefinition, WorkspaceFormat>();

export enum WorkspaceFormat {
  JSON,
}

export function _test_addWorkspaceFile(name: string, format: WorkspaceFormat): void {
  workspaceFiles[name] = format;
}

export function _test_removeWorkspaceFile(name: string): void {
  delete workspaceFiles[name];
}

// NOTE: future additions could also perform content analysis to determine format/version
const workspaceFiles: Record<string, WorkspaceFormat> = {
  'angular.json': WorkspaceFormat.JSON,
  '.angular.json': WorkspaceFormat.JSON,
};

export async function readWorkspace(
  path: string,
  host: WorkspaceHost,
  format?: WorkspaceFormat,
  // return type will eventually have a `diagnostics` property as well
): Promise<{ workspace: WorkspaceDefinition }> {
  if (await host.isDirectory(path)) {
    // TODO: Warn if multiple found (requires diagnostics support)
    const directory = normalize(path);
    let found = false;
    for (const [name, nameFormat] of Object.entries(workspaceFiles)) {
      if (format !== undefined && format !== nameFormat) {
        continue;
      }

      const potential = getSystemPath(join(directory, name));
      if (await host.isFile(potential)) {
        path = potential;
        format = nameFormat;
        found = true;
        break;
      }
    }
    if (!found) {
      throw new Error('Unable to locate a workspace file for workspace path.');
    }
  } else if (format === undefined) {
    const filename = basename(normalize(path));
    if (filename in workspaceFiles) {
      format = workspaceFiles[filename];
    }
  }

  if (format === undefined) {
    throw new Error('Unable to determine format for workspace path.');
  }

  let workspace;
  switch (format) {
    case WorkspaceFormat.JSON:
      workspace = await readJsonWorkspace(path, host);
      break;
    default:
      throw new Error('Unsupported workspace format.');
  }

  formatLookup.set(workspace, WorkspaceFormat.JSON);

  return { workspace };
}

export async function writeWorkspace(
  workspace: WorkspaceDefinition,
  host: WorkspaceHost,
  path?: string,
  format?: WorkspaceFormat,
): Promise<void> {
  if (format === undefined) {
    format = formatLookup.get(workspace);
    if (format === undefined) {
      throw new Error('A format is required for custom workspace objects.');
    }
  }

  switch (format) {
    case WorkspaceFormat.JSON:
      return writeJsonWorkspace(workspace, host, path);
    default:
      throw new Error('Unsupported workspace format.');
  }
}
