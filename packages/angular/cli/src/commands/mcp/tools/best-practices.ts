/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/**
 * @fileoverview
 * This file defines the `get_best_practices` MCP tool. The tool is designed to be version-aware,
 * dynamically resolving the best practices guide from the user's installed version of
 * `@angular/core`. It achieves this by reading a custom `angular` metadata block in the
 * framework's `package.json`. If this resolution fails, it gracefully falls back to a generic
 * guide bundled with the Angular CLI.
 */

import { readFile, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { z } from 'zod';
import { VERSION } from '../../../utilities/version';
import { type McpToolContext, declareTool } from './tool-registry';

const bestPracticesInputSchema = z.object({
  workspacePath: z
    .string()
    .optional()
    .describe(
      'The absolute path to the `angular.json` file for the workspace. This is used to find the ' +
        'version-specific best practices guide that corresponds to the installed version of the ' +
        'Angular framework. You **MUST** get this path from the `list_projects` tool. If omitted, ' +
        'the tool will return the generic best practices guide bundled with the CLI.',
    ),
});

type BestPracticesInput = z.infer<typeof bestPracticesInputSchema>;

export const BEST_PRACTICES_TOOL = declareTool({
  name: 'get_best_practices',
  title: 'Get Angular Coding Best Practices Guide',
  description: `
<Purpose>
Retrieves the official Angular Best Practices Guide. This guide contains the essential rules and conventions
that **MUST** be followed for any task involving the creation, analysis, or modification of Angular code.
</Purpose>
<Use Cases>
* As a mandatory first step before writing or modifying any Angular code to ensure adherence to modern standards.
* To learn about key concepts like standalone components, typed forms, and modern control flow syntax (@if, @for, @switch).
* To verify that existing code aligns with current Angular conventions before making changes.
</Use Cases>
<Operational Notes>
* **Project-Specific Use (Recommended):** For tasks inside a user's project, you **MUST** provide the
  \`workspacePath\` argument to get the guide that matches the project's Angular version. Get this
  path from \`list_projects\`.
* **General Use:** If no project context is available (e.g., for general questions or learning),
  you can call the tool without the \`workspacePath\` argument. It will return the latest
  generic best practices guide.
* The content of this guide is non-negotiable and reflects the official, up-to-date standards for Angular development.
* You **MUST** internalize and apply the principles from this guide in all subsequent Angular-related tasks.
* Failure to adhere to these best practices will result in suboptimal and outdated code.
</Operational Notes>`,
  inputSchema: bestPracticesInputSchema.shape,
  isReadOnly: true,
  isLocalOnly: true,
  factory: createBestPracticesHandler,
});

/**
 * Retrieves the content of the generic best practices guide that is bundled with the CLI.
 * This serves as a fallback when a version-specific guide cannot be found.
 * @returns A promise that resolves to the string content of the bundled markdown file.
 */
async function getBundledBestPractices(): Promise<string> {
  return readFile(join(__dirname, '../resources/best-practices.md'), 'utf-8');
}

/**
 * Attempts to find and read a version-specific best practices guide from the user's installed
 * version of `@angular/core`. It looks for a custom `angular` metadata property in the
 * framework's `package.json` to locate the guide.
 *
 * @example A sample `package.json` `angular` field:
 * ```json
 * {
 *   "angular": {
 *     "bestPractices": {
 *       "format": "markdown",
 *       "path": "./resources/best-practices.md"
 *     }
 *   }
 * }
 * ```
 *
 * @param workspacePath The absolute path to the user's `angular.json` file.
 * @param logger The MCP tool context logger for reporting warnings.
 * @returns A promise that resolves to an object containing the guide's content and source,
 *     or `undefined` if the guide could not be resolved.
 */
async function getVersionSpecificBestPractices(
  workspacePath: string,
  logger: McpToolContext['logger'],
): Promise<{ content: string; source: string } | undefined> {
  // 1. Resolve the path to package.json
  let pkgJsonPath: string;
  try {
    const workspaceRequire = createRequire(workspacePath);
    pkgJsonPath = workspaceRequire.resolve('@angular/core/package.json');
  } catch (e) {
    logger.warn(
      `Could not resolve '@angular/core/package.json' from '${workspacePath}'. ` +
        'Is Angular installed in this project? Falling back to the bundled guide.',
    );

    return undefined;
  }

  // 2. Read and parse package.json, then find and read the guide.
  try {
    const pkgJsonContent = await readFile(pkgJsonPath, 'utf-8');
    const pkgJson = JSON.parse(pkgJsonContent);
    const bestPracticesInfo = pkgJson['angular']?.bestPractices;

    if (
      bestPracticesInfo &&
      bestPracticesInfo.format === 'markdown' &&
      typeof bestPracticesInfo.path === 'string'
    ) {
      const packageDirectory = dirname(pkgJsonPath);
      const guidePath = resolve(packageDirectory, bestPracticesInfo.path);

      // Ensure the resolved guide path is within the package boundary.
      // Uses path.relative to create a cross-platform, case-insensitive check.
      // If the relative path starts with '..' or is absolute, it is a traversal attempt.
      const relativePath = relative(packageDirectory, guidePath);
      if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
        logger.warn(
          `Detected a potential path traversal attempt in '${pkgJsonPath}'. ` +
            `The path '${bestPracticesInfo.path}' escapes the package boundary. ` +
            'Falling back to the bundled guide.',
        );

        return undefined;
      }

      // Check the file size to prevent reading a very large file.
      const stats = await stat(guidePath);
      if (stats.size > 1024 * 1024) {
        // 1MB
        logger.warn(
          `The best practices guide at '${guidePath}' is larger than 1MB (${stats.size} bytes). ` +
            'This is unexpected and the file will not be read. Falling back to the bundled guide.',
        );

        return undefined;
      }

      const content = await readFile(guidePath, 'utf-8');
      const source = `framework version ${pkgJson.version}`;

      return { content, source };
    } else {
      logger.warn(
        `Did not find valid 'angular.bestPractices' metadata in '${pkgJsonPath}'. ` +
          'Falling back to the bundled guide.',
      );
    }
  } catch (e) {
    logger.warn(
      `Failed to read or parse version-specific best practices referenced in '${pkgJsonPath}': ${
        e instanceof Error ? e.message : e
      }. Falling back to the bundled guide.`,
    );
  }

  return undefined;
}

/**
 * Creates the handler function for the `get_best_practices` tool.
 * The handler orchestrates the process of first attempting to get a version-specific guide
 * and then falling back to the bundled guide if necessary.
 * @param context The MCP tool context, containing the logger.
 * @returns An async function that serves as the tool's executor.
 */
function createBestPracticesHandler({ logger }: McpToolContext) {
  let bundledBestPractices: Promise<string>;

  return async (input: BestPracticesInput) => {
    let content: string | undefined;
    let source: string | undefined;

    // First, try to get the version-specific guide.
    if (input.workspacePath) {
      const versionSpecific = await getVersionSpecificBestPractices(input.workspacePath, logger);
      if (versionSpecific) {
        content = versionSpecific.content;
        source = versionSpecific.source;
      }
    }

    // If the version-specific guide was not found for any reason, fall back to the bundled version.
    if (content === undefined) {
      content = await (bundledBestPractices ??= getBundledBestPractices());
      source = `bundled (CLI v${VERSION.full})`;
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: content,
          annotations: {
            audience: ['assistant' as const],
            priority: 0.9,
            source,
          },
        },
      ],
    };
  };
}
