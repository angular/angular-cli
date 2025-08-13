/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path/posix';
import { isDeepStrictEqual } from 'node:util';
import { relativePathToWorkspaceRoot } from '../../utility/paths';
import { KarmaConfigAnalysis, KarmaConfigValue, analyzeKarmaConfig } from './karma-config-analyzer';

/**
 * Represents the difference between two Karma configurations.
 */
export interface KarmaConfigDiff {
  /** A map of settings that were added in the project's configuration. */
  added: Map<string, KarmaConfigValue>;

  /** A map of settings that were removed from the project's configuration. */
  removed: Map<string, KarmaConfigValue>;

  /** A map of settings that were modified between the two configurations. */
  modified: Map<string, { projectValue: KarmaConfigValue; defaultValue: KarmaConfigValue }>;

  /** A boolean indicating if the comparison is reliable (i.e., no unsupported values were found). */
  isReliable: boolean;
}

/**
 * Generates the default Karma configuration file content as a string.
 * @param relativePathToWorkspaceRoot The relative path from the Karma config file to the workspace root.
 * @param projectName The name of the project.
 * @param needDevkitPlugin A boolean indicating if the devkit plugin is needed.
 * @returns The content of the default `karma.conf.js` file.
 */
export async function generateDefaultKarmaConfig(
  relativePathToWorkspaceRoot: string,
  projectName: string,
  needDevkitPlugin: boolean,
): Promise<string> {
  const templatePath = path.join(__dirname, '../../config/files/karma.conf.js.template');
  let template = await readFile(templatePath, 'utf-8');

  // TODO: Replace this with the actual schematic templating logic.
  template = template
    .replace(
      /<%= relativePathToWorkspaceRoot %>/g,
      path.normalize(relativePathToWorkspaceRoot).replace(/\\/g, '/'),
    )
    .replace(/<%= folderName %>/g, projectName);

  const devkitPluginRegex = /<% if \(needDevkitPlugin\) { %>(.*?)<% } %>/gs;
  const replacement = needDevkitPlugin ? '$1' : '';
  template = template.replace(devkitPluginRegex, replacement);

  return template;
}

/**
 * Compares two Karma configuration analyses and returns the difference.
 * @param projectAnalysis The analysis of the project's configuration.
 * @param defaultAnalysis The analysis of the default configuration to compare against.
 * @returns A diff object representing the changes between the two configurations.
 */
export function compareKarmaConfigs(
  projectAnalysis: KarmaConfigAnalysis,
  defaultAnalysis: KarmaConfigAnalysis,
): KarmaConfigDiff {
  const added = new Map<string, KarmaConfigValue>();
  const removed = new Map<string, KarmaConfigValue>();
  const modified = new Map<
    string,
    { projectValue: KarmaConfigValue; defaultValue: KarmaConfigValue }
  >();

  const allKeys = new Set([...projectAnalysis.settings.keys(), ...defaultAnalysis.settings.keys()]);

  for (const key of allKeys) {
    const projectValue = projectAnalysis.settings.get(key);
    const defaultValue = defaultAnalysis.settings.get(key);

    if (projectValue !== undefined && defaultValue === undefined) {
      added.set(key, projectValue);
    } else if (projectValue === undefined && defaultValue !== undefined) {
      removed.set(key, defaultValue);
    } else if (projectValue !== undefined && defaultValue !== undefined) {
      if (!isDeepStrictEqual(projectValue, defaultValue)) {
        modified.set(key, { projectValue, defaultValue });
      }
    }
  }

  return {
    added,
    removed,
    modified,
    isReliable: !projectAnalysis.hasUnsupportedValues && !defaultAnalysis.hasUnsupportedValues,
  };
}

/**
 * Checks if there are any differences in the provided Karma configuration diff.
 * @param diff The Karma configuration diff object to check.
 * @returns True if there are any differences; false otherwise.
 */
export function hasDifferences(diff: KarmaConfigDiff): boolean {
  return diff.added.size > 0 || diff.removed.size > 0 || diff.modified.size > 0;
}

/**
 * Compares a project's Karma configuration with the default configuration.
 * @param projectConfigContent The content of the project's `karma.conf.js` file.
 * @param projectRoot The root directory of the project.
 * @param needDevkitPlugin A boolean indicating if the devkit plugin is needed for the default config.
 * @param karmaConfigPath The path to the Karma configuration file, used to resolve relative paths.
 * @returns A diff object representing the changes.
 */
export async function compareKarmaConfigToDefault(
  projectConfigContent: string,
  projectName: string,
  karmaConfigPath: string,
  needDevkitPlugin: boolean,
): Promise<KarmaConfigDiff>;

/**
 * Compares a project's Karma configuration with the default configuration.
 * @param projectAnalysis The analysis of the project's configuration.
 * @param projectRoot The root directory of the project.
 * @param needDevkitPlugin A boolean indicating if the devkit plugin is needed for the default config.
 * @param karmaConfigPath The path to the Karma configuration file, used to resolve relative paths.
 * @returns A diff object representing the changes.
 */
export async function compareKarmaConfigToDefault(
  projectAnalysis: KarmaConfigAnalysis,
  projectName: string,
  karmaConfigPath: string,
  needDevkitPlugin: boolean,
): Promise<KarmaConfigDiff>;

export async function compareKarmaConfigToDefault(
  projectConfigOrAnalysis: string | KarmaConfigAnalysis,
  projectName: string,
  karmaConfigPath: string,
  needDevkitPlugin: boolean,
): Promise<KarmaConfigDiff> {
  const projectAnalysis =
    typeof projectConfigOrAnalysis === 'string'
      ? analyzeKarmaConfig(projectConfigOrAnalysis)
      : projectConfigOrAnalysis;

  const defaultContent = await generateDefaultKarmaConfig(
    relativePathToWorkspaceRoot(path.dirname(karmaConfigPath)),
    projectName,
    needDevkitPlugin,
  );
  const defaultAnalysis = analyzeKarmaConfig(defaultContent);

  return compareKarmaConfigs(projectAnalysis, defaultAnalysis);
}
