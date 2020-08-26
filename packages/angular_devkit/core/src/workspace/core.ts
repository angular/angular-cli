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

/**
 * Supported workspace formats
 */
export enum WorkspaceFormat {
  JSON,
}

/**
 * @private
 */
export function _test_addWorkspaceFile(name: string, format: WorkspaceFormat): void {
  workspaceFiles[name] = format;
}

/**
 * @private
 */
export function _test_removeWorkspaceFile(name: string): void {
  delete workspaceFiles[name];
}

// NOTE: future additions could also perform content analysis to determine format/version
const workspaceFiles: Record<string, WorkspaceFormat> = {
  'angular.json': WorkspaceFormat.JSON,
  '.angular.json': WorkspaceFormat.JSON,
};

/**
 * Reads and constructs a `WorkspaceDefinition`.  If the function is provided with a path to a
 * directory instead of a file, a search of the directory's files will commence to attempt to
 * locate a known workspace file.  Currently the following are considered known workspace files:
 * - `angular.json`
 * - `.angular.json`
 *
 * @param path The path to either a workspace file or a directory containing a workspace file.
 * @param host The `WorkspaceHost` to use to access the file and directory data.
 * @param format An optional `WorkspaceFormat` value. Used if the path specifies a non-standard
 * file name that would prevent automatically discovering the format.
 *
 *
 * @return An `Promise` of the read result object with the `WorkspaceDefinition` contained within
 * the `workspace` property.
 */
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

/**
 * Writes a `WorkspaceDefinition` to the underlying storage via the provided `WorkspaceHost`.
 * If the `WorkspaceDefinition` was created via the `readWorkspace` function, metadata will be
 * used to determine the path and format of the Workspace.  In all other cases, the `path` and
 * `format` options must be specified as they would be otherwise unknown.
 *
 * @param workspace The `WorkspaceDefinition` that will be written.
 * @param host The `WorkspaceHost` to use to access/write the file and directory data.
 * @param path The path to a file location for the output. Required if `readWorkspace` was not
 * used to create the `WorkspaceDefinition`.  Optional otherwise; will override the
 * `WorkspaceDefinition` metadata if provided.
 * @param format The `WorkspaceFormat` to use for output. Required if `readWorkspace` was not
 * used to create the `WorkspaceDefinition`.  Optional otherwise; will override the
 * `WorkspaceDefinition` metadata if provided.
 *
 *
 * @return An `Promise` of type `void`.
 */
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
