/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import semver from 'semver';
import z from 'zod';
import { AngularWorkspace } from '../../../utilities/config';
import { assertIsError } from '../../../utilities/error';
import { McpToolContext, declareTool } from './tool-registry';

const listProjectsOutputSchema = {
  workspaces: z.array(
    z.object({
      path: z.string().describe('The path to the `angular.json` file for this workspace.'),
      frameworkVersion: z
        .string()
        .optional()
        .describe(
          'The major version of the Angular framework (`@angular/core`) in this workspace, if found.',
        ),
      projects: z.array(
        z.object({
          name: z
            .string()
            .describe('The name of the project, as defined in the `angular.json` file.'),
          type: z
            .enum(['application', 'library'])
            .optional()
            .describe(`The type of the project, either 'application' or 'library'.`),
          builder: z
            .string()
            .optional()
            .describe('The primary builder for the project, typically from the "build" target.'),
          root: z
            .string()
            .describe('The root directory of the project, relative to the workspace root.'),
          sourceRoot: z
            .string()
            .describe(
              `The root directory of the project's source files, relative to the workspace root.`,
            ),
          selectorPrefix: z
            .string()
            .optional()
            .describe(
              'The prefix to use for component selectors.' +
                ` For example, a prefix of 'app' would result in selectors like '<app-my-component>'.`,
            ),
        }),
      ),
    }),
  ),
  parsingErrors: z
    .array(
      z.object({
        filePath: z.string().describe('The path to the file that could not be parsed.'),
        message: z.string().describe('The error message detailing why parsing failed.'),
      }),
    )
    .default([])
    .describe('A list of files that looked like workspaces but failed to parse.'),
  versioningErrors: z
    .array(
      z.object({
        filePath: z
          .string()
          .describe('The path to the workspace `angular.json` for which versioning failed.'),
        message: z.string().describe('The error message detailing why versioning failed.'),
      }),
    )
    .default([])
    .describe('A list of workspaces for which the framework version could not be determined.'),
};

export const LIST_PROJECTS_TOOL = declareTool({
  name: 'list_projects',
  title: 'List Angular Projects',
  description: `
<Purpose>
Provides a comprehensive overview of all Angular workspaces and projects within a monorepo.
It is essential to use this tool as a first step before performing any project-specific actions to understand the available projects,
their types, and their locations.
</Purpose>
<Use Cases>
* Finding the correct project name to use in other commands (e.g., \`ng generate component my-comp --project=my-app\`).
* Identifying the \`root\` and \`sourceRoot\` of a project to read, analyze, or modify its files.
* Determining if a project is an \`application\` or a \`library\`.
* Getting the \`selectorPrefix\` for a project before generating a new component to ensure it follows conventions.
* Identifying the major version of the Angular framework for each workspace, which is crucial for monorepos.
* Determining a project's primary function by inspecting its builder (e.g., '@angular-devkit/build-angular:browser' for an application).
</Use Cases>
<Operational Notes>
* **Working Directory:** Shell commands for a project (like \`ng generate\`) **MUST**
  be executed from the parent directory of the \`path\` field for the relevant workspace.
* **Disambiguation:** A monorepo may contain multiple workspaces (e.g., for different applications or even in output directories).
  Use the \`path\` of each workspace to understand its context and choose the correct project.
</Operational Notes>`,
  outputSchema: listProjectsOutputSchema,
  isReadOnly: true,
  isLocalOnly: true,
  factory: createListProjectsHandler,
});

const EXCLUDED_DIRS = new Set(['node_modules', 'dist', 'out', 'coverage']);

/**
 * Iteratively finds all 'angular.json' files with controlled concurrency and directory exclusions.
 * This non-recursive implementation is suitable for very large directory trees
 * and prevents file descriptor exhaustion (`EMFILE` errors).
 * @param rootDir The directory to start the search from.
 * @returns An async generator that yields the full path of each found 'angular.json' file.
 */
async function* findAngularJsonFiles(rootDir: string): AsyncGenerator<string> {
  const CONCURRENCY_LIMIT = 50;
  const queue: string[] = [rootDir];

  while (queue.length > 0) {
    const batch = queue.splice(0, CONCURRENCY_LIMIT);
    const foundFilesInBatch: string[] = [];

    const promises = batch.map(async (dir) => {
      try {
        const entries = await readdir(dir, { withFileTypes: true });
        const subdirectories: string[] = [];
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            // Exclude dot-directories, build/cache directories, and node_modules
            if (entry.name.startsWith('.') || EXCLUDED_DIRS.has(entry.name)) {
              continue;
            }
            subdirectories.push(fullPath);
          } else if (entry.name === 'angular.json') {
            foundFilesInBatch.push(fullPath);
          }
        }

        return subdirectories;
      } catch (error) {
        assertIsError(error);
        if (error.code === 'EACCES' || error.code === 'EPERM') {
          return []; // Silently ignore permission errors.
        }
        throw error;
      }
    });

    const nestedSubdirs = await Promise.all(promises);
    queue.push(...nestedSubdirs.flat());

    yield* foundFilesInBatch;
  }
}

/**
 * Searches upwards from a starting directory to find the version of '@angular/core'.
 * It caches results to avoid redundant lookups.
 * @param startDir The directory to start the search from.
 * @param cache A map to store cached results.
 * @param searchRoot The directory at which to stop the search.
 * @returns The major version of '@angular/core' as a string, otherwise undefined.
 */
async function findAngularCoreVersion(
  startDir: string,
  cache: Map<string, string | undefined>,
  searchRoot: string,
): Promise<string | undefined> {
  let currentDir = startDir;
  const dirsToCache: string[] = [];

  while (currentDir) {
    dirsToCache.push(currentDir);
    if (cache.has(currentDir)) {
      const cachedResult = cache.get(currentDir);
      // Populate cache for all intermediate directories.
      for (const dir of dirsToCache) {
        cache.set(dir, cachedResult);
      }

      return cachedResult;
    }

    const pkgPath = path.join(currentDir, 'package.json');
    try {
      const pkgContent = await readFile(pkgPath, 'utf-8');
      const pkg = JSON.parse(pkgContent);
      const versionSpecifier =
        pkg.dependencies?.['@angular/core'] ?? pkg.devDependencies?.['@angular/core'];

      if (versionSpecifier) {
        const minVersion = semver.minVersion(versionSpecifier);
        const result = minVersion ? String(minVersion.major) : undefined;
        for (const dir of dirsToCache) {
          cache.set(dir, result);
        }

        return result;
      }
    } catch (error) {
      assertIsError(error);
      if (error.code !== 'ENOENT') {
        // Ignore missing package.json files, but rethrow other errors.
        throw error;
      }
    }

    // Stop if we are at the search root or the filesystem root.
    if (currentDir === searchRoot) {
      break;
    }
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      break; // Reached the filesystem root.
    }
    currentDir = parentDir;
  }

  // Cache the failure for all traversed directories.
  for (const dir of dirsToCache) {
    cache.set(dir, undefined);
  }

  return undefined;
}

// Types for the structured output of the helper function.
type WorkspaceData = z.infer<typeof listProjectsOutputSchema.workspaces>[number];
type ParsingError = z.infer<typeof listProjectsOutputSchema.parsingErrors>[number];

/**
 * Loads, parses, and transforms a single angular.json file into the tool's output format.
 * It checks a set of seen paths to avoid processing the same workspace multiple times.
 * @param configFile The path to the angular.json file.
 * @param seenPaths A Set of absolute paths that have already been processed.
 * @returns A promise resolving to the workspace data or a parsing error.
 */
async function loadAndParseWorkspace(
  configFile: string,
  seenPaths: Set<string>,
): Promise<{ workspace: WorkspaceData | null; error: ParsingError | null }> {
  try {
    const resolvedPath = path.resolve(configFile);
    if (seenPaths.has(resolvedPath)) {
      return { workspace: null, error: null }; // Already processed, skip.
    }
    seenPaths.add(resolvedPath);

    const ws = await AngularWorkspace.load(configFile);
    const projects = [];
    for (const [name, project] of ws.projects.entries()) {
      projects.push({
        name,
        type: project.extensions['projectType'] as 'application' | 'library' | undefined,
        builder: project.targets.get('build')?.builder,
        root: project.root,
        sourceRoot: project.sourceRoot ?? path.posix.join(project.root, 'src'),
        selectorPrefix: project.extensions['prefix'] as string,
      });
    }

    return { workspace: { path: configFile, projects }, error: null };
  } catch (error) {
    let message;
    if (error instanceof Error) {
      message = error.message;
    } else {
      message = 'An unknown error occurred while parsing the file.';
    }

    return { workspace: null, error: { filePath: configFile, message } };
  }
}

// Types for the structured output of the helper function.
type VersioningError = z.infer<typeof listProjectsOutputSchema.versioningErrors>[number];

/**
 * Processes a single `angular.json` file to extract workspace and framework version information.
 * @param configFile The path to the `angular.json` file.
 * @param searchRoot The directory at which to stop the upward search for `package.json`.
 * @param seenPaths A Set of absolute paths that have already been processed to avoid duplicates.
 * @param versionCache A Map to cache framework version lookups for performance.
 * @returns A promise resolving to an object containing the processed data and any errors.
 */
async function processConfigFile(
  configFile: string,
  searchRoot: string,
  seenPaths: Set<string>,
  versionCache: Map<string, string | undefined>,
): Promise<{
  workspace?: WorkspaceData;
  parsingError?: ParsingError;
  versioningError?: VersioningError;
}> {
  const { workspace, error } = await loadAndParseWorkspace(configFile, seenPaths);
  if (error) {
    return { parsingError: error };
  }

  if (!workspace) {
    return {}; // Skipped as it was already seen.
  }

  try {
    const workspaceDir = path.dirname(configFile);
    workspace.frameworkVersion = await findAngularCoreVersion(
      workspaceDir,
      versionCache,
      searchRoot,
    );

    return { workspace };
  } catch (e) {
    return {
      workspace,
      versioningError: {
        filePath: workspace.path,
        message: e instanceof Error ? e.message : 'An unknown error occurred.',
      },
    };
  }
}

async function createListProjectsHandler({ server }: McpToolContext) {
  return async () => {
    const workspaces: WorkspaceData[] = [];
    const parsingErrors: ParsingError[] = [];
    const versioningErrors: z.infer<typeof listProjectsOutputSchema.versioningErrors> = [];
    const seenPaths = new Set<string>();
    const versionCache = new Map<string, string | undefined>();

    let searchRoots: string[];
    const clientCapabilities = server.server.getClientCapabilities();
    if (clientCapabilities?.roots) {
      const { roots } = await server.server.listRoots();
      searchRoots = roots?.map((r) => path.normalize(fileURLToPath(r.uri))) ?? [];
    } else {
      // Fallback to the current working directory if client does not support roots
      searchRoots = [process.cwd()];
    }

    for (const root of searchRoots) {
      for await (const configFile of findAngularJsonFiles(root)) {
        const { workspace, parsingError, versioningError } = await processConfigFile(
          configFile,
          root,
          seenPaths,
          versionCache,
        );

        if (workspace) {
          workspaces.push(workspace);
        }
        if (parsingError) {
          parsingErrors.push(parsingError);
        }
        if (versioningError) {
          versioningErrors.push(versioningError);
        }
      }
    }

    if (workspaces.length === 0 && parsingErrors.length === 0) {
      return {
        content: [
          {
            type: 'text' as const,
            text:
              'No Angular workspace found.' +
              ' An `angular.json` file, which marks the root of a workspace,' +
              ' could not be located in the current directory or any of its parent directories.',
          },
        ],
        structuredContent: { workspaces: [] },
      };
    }

    let text = `Found ${workspaces.length} workspace(s).\n${JSON.stringify({ workspaces })}`;
    if (parsingErrors.length > 0) {
      text += `\n\nWarning: The following ${parsingErrors.length} file(s) could not be parsed and were skipped:\n`;
      text += parsingErrors.map((e) => `- ${e.filePath}: ${e.message}`).join('\n');
    }
    if (versioningErrors.length > 0) {
      text += `\n\nWarning: The framework version for the following ${versioningErrors.length} workspace(s) could not be determined:\n`;
      text += versioningErrors.map((e) => `- ${e.filePath}: ${e.message}`).join('\n');
    }

    return {
      content: [{ type: 'text' as const, text }],
      structuredContent: { workspaces, parsingErrors, versioningErrors },
    };
  };
}
