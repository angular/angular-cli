/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/**
 * @fileoverview This file contains the parser functions that are used to
 * interpret the output of various package manager commands. Separating these
 * into their own file improves modularity and allows for focused testing.
 */

import { ErrorInfo } from './error';
import { Logger } from './logger';
import { PackageManifest, PackageMetadata } from './package-metadata';
import { InstalledPackage } from './package-tree';

const MAX_LOG_LENGTH = 1024;

function logStdout(stdout: string, logger?: Logger): void {
  if (!logger) {
    return;
  }

  let output = stdout;
  if (output.length > MAX_LOG_LENGTH) {
    output = `${output.slice(0, MAX_LOG_LENGTH)}... (truncated)`;
  }

  logger.debug(`  stdout:\n${output}`);
}

/**
 * A generator function that parses a string containing JSONL (newline-delimited JSON)
 * and yields each successfully parsed JSON object.
 * @param output The string output to parse.
 * @param logger An optional logger instance.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function* parseJsonLines(output: string, logger?: Logger): Generator<any> {
  for (const line of output.split('\n')) {
    if (!line.trim()) {
      continue;
    }
    try {
      yield JSON.parse(line);
    } catch (e) {
      logger?.debug(`  Ignoring non-JSON line: ${e}`);
    }
  }
}

interface NpmListDependency {
  version: string;
  path?: string;
  [key: string]: unknown;
}

/**
 * Parses the output of `npm list` or a compatible command.
 *
 * The expected JSON structure is:
 * ```json
 * {
 *   "dependencies": {
 *     "@angular/cli": {
 *       "version": "18.0.0",
 *       "path": "/path/to/project/node_modules/@angular/cli", // path is optional
 *       ... (other package.json properties)
 *     }
 *   }
 * }
 * ```
 *
 * @param stdout The standard output of the command.
 * @param logger An optional logger instance.
 * @returns A map of package names to their installed package details.
 */
export function parseNpmLikeDependencies(
  stdout: string,
  logger?: Logger,
): Map<string, InstalledPackage> {
  logger?.debug(`Parsing npm-like dependency list...`);
  logStdout(stdout, logger);

  const dependencies = new Map<string, InstalledPackage>();
  if (!stdout) {
    logger?.debug('  stdout is empty. No dependencies found.');

    return dependencies;
  }

  let data = JSON.parse(stdout);
  if (Array.isArray(data)) {
    // pnpm returns an array of projects.
    data = data[0];
  }

  const dependencyMaps = [data.dependencies, data.devDependencies, data.unsavedDependencies].filter(
    (d) => !!d,
  );

  if (dependencyMaps.length === 0) {
    logger?.debug('  `dependencies` property not found. No dependencies found.');

    return dependencies;
  }

  for (const dependencyMap of dependencyMaps) {
    for (const [name, info] of Object.entries(dependencyMap as Record<string, NpmListDependency>)) {
      dependencies.set(name, {
        name,
        version: info.version,
        path: info.path,
      });
    }
  }

  logger?.debug(`  Found ${dependencies.size} dependencies.`);

  return dependencies;
}

/**
 * Parses the output of `yarn list` (classic).
 *
 * The expected output is a JSON stream (JSONL), where each line is a JSON object.
 * The relevant object has a `type` of `'tree'` with a `data` property.
 * Yarn classic does not provide a path, so the `path` property will be `undefined`.
 *
 * ```json
 * {"type":"tree","data":{"trees":[{"name":"@angular/cli@18.0.0","children":[]}]}}
 * ```
 *
 * @param stdout The standard output of the command.
 * @param logger An optional logger instance.
 * @returns A map of package names to their installed package details.
 */
export function parseYarnClassicDependencies(
  stdout: string,
  logger?: Logger,
): Map<string, InstalledPackage> {
  logger?.debug(`Parsing yarn classic dependency list...`);
  logStdout(stdout, logger);

  const dependencies = new Map<string, InstalledPackage>();
  if (!stdout) {
    logger?.debug('  stdout is empty. No dependencies found.');

    return dependencies;
  }

  for (const json of parseJsonLines(stdout, logger)) {
    if (json.type === 'tree' && json.data?.trees) {
      for (const info of json.data.trees) {
        const name = info.name.split('@')[0];
        const version = info.name.split('@').pop();
        dependencies.set(name, {
          name,
          version,
        });
      }
    }
  }

  logger?.debug(`  Found ${dependencies.size} dependencies.`);

  return dependencies;
}

/**
 * Parses the output of `yarn list` (modern).
 *
 * The expected JSON structure is a single object.
 * Yarn modern does not provide a path, so the `path` property will be `undefined`.
 *
 * ```json
 * {
 *   "trees": [
 *     { "name": "@angular/cli@18.0.0", "children": [] }
 *   ]
 * }
 * ```
 *
 * @param stdout The standard output of the command.
 * @param logger An optional logger instance.
 * @returns A map of package names to their installed package details.
 */
export function parseYarnModernDependencies(
  stdout: string,
  logger?: Logger,
): Map<string, InstalledPackage> {
  logger?.debug(`Parsing yarn modern dependency list...`);
  logStdout(stdout, logger);

  const dependencies = new Map<string, InstalledPackage>();
  if (!stdout) {
    logger?.debug('  stdout is empty. No dependencies found.');

    return dependencies;
  }

  // Modern yarn `list` command outputs a single JSON object with a `trees` property.
  // Each line is not a separate JSON object.
  try {
    const data = JSON.parse(stdout);
    for (const info of data.trees) {
      const name = info.name.split('@')[0];
      const version = info.name.split('@').pop();
      dependencies.set(name, {
        name,
        version,
      });
    }
  } catch (e) {
    logger?.debug(
      `  Failed to parse as single JSON object: ${e}. Falling back to line-by-line parsing.`,
    );
    // Fallback for older versions of yarn berry that might still output json lines
    for (const json of parseJsonLines(stdout, logger)) {
      if (json.type === 'tree' && json.data?.trees) {
        for (const info of json.data.trees) {
          const name = info.name.split('@')[0];
          const version = info.name.split('@').pop();
          dependencies.set(name, {
            name,
            version,
          });
        }
      }
    }
  }

  logger?.debug(`  Found ${dependencies.size} dependencies.`);

  return dependencies;
}

/**
 * Parses the output of `npm view` or a compatible command to get a package manifest.
 * @param stdout The standard output of the command.
 * @param logger An optional logger instance.
 * @returns The package manifest object.
 */
export function parseNpmLikeManifest(stdout: string, logger?: Logger): PackageManifest | null {
  logger?.debug(`Parsing npm-like manifest...`);
  logStdout(stdout, logger);

  if (!stdout) {
    logger?.debug('  stdout is empty. No manifest found.');

    return null;
  }

  return JSON.parse(stdout);
}

/**
 * Parses the output of `npm view` or a compatible command to get package metadata.
 * @param stdout The standard output of the command.
 * @param logger An optional logger instance.
 * @returns The package metadata object.
 */
export function parseNpmLikeMetadata(stdout: string, logger?: Logger): PackageMetadata | null {
  logger?.debug(`Parsing npm-like metadata...`);
  logStdout(stdout, logger);

  if (!stdout) {
    logger?.debug('  stdout is empty. No metadata found.');

    return null;
  }

  return JSON.parse(stdout);
}

/**
 * Parses the output of `yarn info` (classic) to get a package manifest.
 *
 * When `yarn info --verbose` is used, the output is a JSONL stream. This function
 * iterates through the lines to find the object with `type: 'inspect'` which contains
 * the package manifest.
 *
 * For non-verbose output, it falls back to parsing a single JSON object.
 *
 * @param stdout The standard output of the command.
 * @param logger An optional logger instance.
 * @returns The package manifest object, or `null` if not found.
 */
export function parseYarnClassicManifest(stdout: string, logger?: Logger): PackageManifest | null {
  logger?.debug(`Parsing yarn classic manifest...`);
  logStdout(stdout, logger);

  if (!stdout) {
    logger?.debug('  stdout is empty. No manifest found.');

    return null;
  }

  // Yarn classic outputs JSONL. We need to find the relevant object.
  let manifest;
  for (const json of parseJsonLines(stdout, logger)) {
    // The manifest data is in a JSON object with type 'inspect'.
    if (json.type === 'inspect' && json.data) {
      manifest = json.data;
      break;
    }
  }

  if (!manifest) {
    logger?.debug('  Failed to find manifest in yarn classic output.');

    return null;
  }

  // Yarn classic removes any field with a falsy value
  // https://github.com/yarnpkg/yarn/blob/7cafa512a777048ce0b666080a24e80aae3d66a9/src/cli/commands/info.js#L26-L29
  // Add a default of 'false' for the `save` field when the `ng-add` object is present but does not have any fields.
  // There is a small chance this causes an incorrect value. However, the use of `ng-add` is rare and, in the cases
  // it is used, save is set to either a `false` literal or a truthy value. Special cases can be added for specific
  // packages if discovered.
  if (
    manifest['ng-add'] &&
    typeof manifest['ng-add'] === 'object' &&
    Object.keys(manifest['ng-add']).length === 0
  ) {
    manifest['ng-add'].save ??= false;
  }

  return manifest;
}

/**
 * Parses the output of `yarn info` (classic) to get package metadata.
 * @param stdout The standard output of the command.
 * @param logger An optional logger instance.
 * @returns The package metadata object.
 */
export function parseYarnClassicMetadata(stdout: string, logger?: Logger): PackageMetadata | null {
  logger?.debug(`Parsing yarn classic metadata...`);
  logStdout(stdout, logger);

  if (!stdout) {
    logger?.debug('  stdout is empty. No metadata found.');

    return null;
  }

  // Yarn classic outputs JSONL. We need to find the relevant object.
  let metadata;
  for (const json of parseJsonLines(stdout, logger)) {
    // The metadata data is in a JSON object with type 'inspect'.
    if (json.type === 'inspect' && json.data) {
      metadata = json.data;
      break;
    }
  }

  if (!metadata) {
    logger?.debug('  Failed to find metadata in yarn classic output.');

    return null;
  }

  return metadata;
}

/**
 * Parses the `stdout` or `stderr` output of npm, pnpm, modern yarn, or bun to extract structured error information.
 *
 * This parser uses a multi-stage approach. It first attempts to parse the entire `output` as a
 * single JSON object, which is the standard for modern tools like pnpm, yarn, and bun. If JSON
 * parsing fails, it falls back to a line-by-line regex-based approach to handle the plain
 * text output from older versions of npm.
 *
 * Example JSON output (pnpm):
 * ```json
 * {
 *   "code": "E404",
 *   "summary": "Not Found - GET https://registry.npmjs.org/@angular%2fnon-existent - Not found",
 *   "detail": "The requested resource '@angular/non-existent@*' could not be found or you do not have permission to access it."
 * }
 * ```
 *
 * Example text output (npm):
 * ```
 * npm error code E404
 * npm error 404 Not Found - GET https://registry.npmjs.org/@angular%2fnon-existent - Not found
 * ```
 *
 * @param output The standard output or standard error of the command.
 * @param logger An optional logger instance.
 * @returns An `ErrorInfo` object if parsing is successful, otherwise `null`.
 */
export function parseNpmLikeError(output: string, logger?: Logger): ErrorInfo | null {
  logger?.debug(`Parsing npm-like error output...`);
  logStdout(output, logger); // Log output for debugging purposes

  if (!output) {
    logger?.debug('  output is empty. No error found.');

    return null;
  }

  // Attempt to parse as JSON first (common for pnpm, modern yarn, bun)
  try {
    const jsonError = JSON.parse(output);
    if (
      jsonError &&
      typeof jsonError.code === 'string' &&
      (typeof jsonError.summary === 'string' || typeof jsonError.message === 'string')
    ) {
      const summary = jsonError.summary || jsonError.message;
      logger?.debug(`  Successfully parsed JSON error with code '${jsonError.code}'.`);

      return {
        code: jsonError.code,
        summary,
        detail: jsonError.detail,
      };
    }
  } catch (e) {
    logger?.debug(`  Failed to parse output as JSON: ${e}. Attempting regex fallback.`);
    // Fallback to regex for plain text errors (common for npm)
  }

  // Regex for npm-like error codes (e.g., `npm ERR! code E404` or `npm error code E404`)
  const errorCodeMatch = output.match(/npm (ERR!|error) code (E\d{3}|[A-Z_]+)/);
  if (errorCodeMatch) {
    const code = errorCodeMatch[2]; // Capture group 2 is the actual error code
    let summary: string | undefined;

    // Find the most descriptive summary line (the line after `npm ERR! code ...` or `npm error code ...`).
    for (const line of output.split('\n')) {
      if (line.startsWith('npm ERR!') && !line.includes(' code ')) {
        summary = line.replace('npm ERR! ', '').trim();
        break;
      } else if (line.startsWith('npm error') && !line.includes(' code ')) {
        summary = line.replace('npm error ', '').trim();
        break;
      }
    }

    logger?.debug(`  Successfully parsed text error with code '${code}'.`);

    return {
      code,
      summary: summary || `Package manager error: ${code}`,
    };
  }

  logger?.debug('  Failed to parse npm-like error. No structured error found.');

  return null;
}

/**
 * Parses the `stdout` or `stderr` output of yarn classic to extract structured error information.
 *
 * This parser first attempts to find an HTTP status code (e.g., 404, 401) in the verbose output.
 * If found, it returns a standardized error code (`E${statusCode}`).
 * If no HTTP status code is found, it falls back to parsing generic JSON error lines.
 *
 * Example verbose output (with HTTP status code):
 * ```json
 * {"type":"verbose","data":"Request \"https://registry.npmjs.org/@angular%2fnon-existent\" finished with status code 404."}
 * ```
 *
 * Example generic JSON error output:
 * ```json
 * {"type":"error","data":"Received invalid response from npm."}
 * ```
 *
 * @param output The standard output or standard error of the command.
 * @param logger An optional logger instance.
 * @returns An `ErrorInfo` object if parsing is successful, otherwise `null`.
 */
export function parseYarnClassicError(output: string, logger?: Logger): ErrorInfo | null {
  logger?.debug(`Parsing yarn classic error output...`);
  logStdout(output, logger); // Log output for debugging purposes

  if (!output) {
    logger?.debug('  output is empty. No error found.');

    return null;
  }

  // First, check for any HTTP status code in the verbose output.
  const statusCodeMatch = output.match(/finished with status code (\d{3})/);
  if (statusCodeMatch) {
    const statusCode = Number(statusCodeMatch[1]);
    // Status codes in the 200-299 range are successful.
    if (statusCode < 200 || statusCode >= 300) {
      logger?.debug(`  Detected HTTP error status code '${statusCode}' in verbose output.`);

      return {
        code: `E${statusCode}`,
        summary: `Request failed with status code ${statusCode}.`,
      };
    }
  }

  // Fallback to the JSON error type if no HTTP status code is present.
  for (const json of parseJsonLines(output, logger)) {
    if (json.type === 'error' && typeof json.data === 'string') {
      const summary = json.data;
      logger?.debug(`  Successfully parsed generic yarn classic error.`);

      return {
        code: 'UNKNOWN_ERROR',
        summary,
      };
    }
  }

  logger?.debug('  Failed to parse yarn classic error. No structured error found.');

  return null;
}
