/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {
  JsonAstObject,
  JsonObject,
  JsonParseMode,
  experimental,
  normalize,
  parseJson,
  parseJsonAst,
  virtualFs,
} from '@angular-devkit/core';
import { NodeJsSyncHost } from '@angular-devkit/core/node';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { findUp } from './find-up';

function getSchemaLocation(): string {
  return path.join(__dirname, '../lib/config/schema.json');
}

export const workspaceSchemaPath = getSchemaLocation();

const configNames = [ 'angular.json', '.angular.json' ];
const globalFileName = '.angular-config.json';

function projectFilePath(projectPath?: string): string | null {
  // Find the configuration, either where specified, in the Angular CLI project
  // (if it's in node_modules) or from the current process.
  return (projectPath && findUp(configNames, projectPath))
      || findUp(configNames, process.cwd())
      || findUp(configNames, __dirname);
}

function globalFilePath(): string | null {
  const home = os.homedir();
  if (!home) {
    return null;
  }

  const p = path.join(home, globalFileName);
  if (existsSync(p)) {
    return p;
  }

  return null;
}

const cachedWorkspaces = new Map<string, experimental.workspace.Workspace | null>();

export async function getWorkspace(
  level: 'local' | 'global' = 'local',
): Promise<experimental.workspace.Workspace | null> {
  const cached = cachedWorkspaces.get(level);
  if (cached != undefined) {
    return cached;
  }

  const configPath = level === 'local' ? projectFilePath() : globalFilePath();

  if (!configPath) {
    cachedWorkspaces.set(level, null);

    return null;
  }

  const root = normalize(path.dirname(configPath));
  const file = normalize(path.basename(configPath));
  const workspace = new experimental.workspace.Workspace(
    root,
    new NodeJsSyncHost(),
  );

  try {
    await workspace.loadWorkspaceFromHost(file).toPromise();
  } catch (error) {
    throw new Error(
      `Workspace config file cannot be loaded: ${configPath}`
      + `\n${error instanceof Error ? error.message : error}`,
    );
  }

  cachedWorkspaces.set(level, workspace);

  return workspace;
}

export function createGlobalSettings(): string {
  const home = os.homedir();
  if (!home) {
    throw new Error('No home directory found.');
  }

  const globalPath = path.join(home, globalFileName);
  writeFileSync(globalPath, JSON.stringify({ version: 1 }));

  return globalPath;
}

export function getWorkspaceRaw(
  level: 'local' | 'global' = 'local',
): [JsonAstObject | null, string | null] {
  let configPath = level === 'local' ? projectFilePath() : globalFilePath();

  if (!configPath) {
    if (level === 'global') {
      configPath = createGlobalSettings();
    } else {
      return [null, null];
    }
  }

  let content = '';
  new NodeJsSyncHost().read(normalize(configPath))
    .subscribe(data => content = virtualFs.fileBufferToString(data));

  const ast = parseJsonAst(content, JsonParseMode.Loose);

  if (ast.kind != 'object') {
    throw new Error(`Invalid JSON file: ${configPath}`);
  }

  return [ast, configPath];
}

export async function validateWorkspace(json: JsonObject) {
  const workspace = new experimental.workspace.Workspace(
    normalize('.'),
    new NodeJsSyncHost(),
  );

  await workspace.loadWorkspaceFromJson(json).toPromise();

  return true;
}

export function getProjectByCwd(workspace: experimental.workspace.Workspace): string | null {
  try {
    return workspace.getProjectByPath(normalize(process.cwd()));
  } catch (e) {
    if (e instanceof experimental.workspace.AmbiguousProjectPathException) {
      return workspace.getDefaultProjectName();
    }
    throw e;
  }
}

export async function getConfiguredPackageManager(): Promise<string | null> {
  let workspace = await getWorkspace('local');

  if (workspace) {
    const project = getProjectByCwd(workspace);
    if (project && workspace.getProjectCli(project)) {
      const value = workspace.getProjectCli(project)['packageManager'];
      if (typeof value == 'string') {
        return value;
      }
    }
    if (workspace.getCli()) {
      const value = workspace.getCli()['packageManager'];
      if (typeof value == 'string') {
        return value;
      }
    }
  }

  workspace = await getWorkspace('global');
  if (workspace && workspace.getCli()) {
    const value = workspace.getCli()['packageManager'];
    if (typeof value == 'string') {
      return value;
    }
  }

  // Only check legacy if updated workspace is not found.
  if (!workspace) {
    const legacyPackageManager = getLegacyPackageManager();
    if (legacyPackageManager !== null) {
      return legacyPackageManager;
    }
  }

  return null;
}

export function migrateLegacyGlobalConfig(): boolean {
  const homeDir = os.homedir();
  if (homeDir) {
    const legacyGlobalConfigPath = path.join(homeDir, '.angular-cli.json');
    if (existsSync(legacyGlobalConfigPath)) {
      const content = readFileSync(legacyGlobalConfigPath, 'utf-8');
      const legacy = parseJson(content, JsonParseMode.Loose);
      if (!legacy || typeof legacy != 'object' || Array.isArray(legacy)) {
        return false;
      }

      const cli: JsonObject = {};

      if (legacy.packageManager && typeof legacy.packageManager == 'string'
          && legacy.packageManager !== 'default') {
        cli['packageManager'] = legacy.packageManager;
      }

      if (legacy.defaults && typeof legacy.defaults == 'object' && !Array.isArray(legacy.defaults)
          && legacy.defaults.schematics && typeof legacy.defaults.schematics == 'object'
          && !Array.isArray(legacy.defaults.schematics)
          && typeof legacy.defaults.schematics.collection == 'string') {
        cli['defaultCollection'] = legacy.defaults.schematics.collection;
      }

      if (legacy.warnings && typeof legacy.warnings == 'object'
          && !Array.isArray(legacy.warnings)) {

        const warnings: JsonObject = {};
        if (typeof legacy.warnings.versionMismatch == 'boolean') {
          warnings['versionMismatch'] = legacy.warnings.versionMismatch;
        }

        if (Object.getOwnPropertyNames(warnings).length > 0) {
          cli['warnings'] = warnings;
        }
      }

      if (Object.getOwnPropertyNames(cli).length > 0) {
        const globalPath = path.join(homeDir, globalFileName);
        writeFileSync(globalPath, JSON.stringify({ version: 1, cli }, null, 2));

        return true;
      }
    }
  }

  return false;
}

// Fallback, check for packageManager in config file in v1.* global config.
function getLegacyPackageManager(): string | null {
  const homeDir = os.homedir();
  if (homeDir) {
    const legacyGlobalConfigPath = path.join(homeDir, '.angular-cli.json');
    if (existsSync(legacyGlobalConfigPath)) {
      const content = readFileSync(legacyGlobalConfigPath, 'utf-8');

      const legacy = parseJson(content, JsonParseMode.Loose);
      if (!legacy || typeof legacy != 'object' || Array.isArray(legacy)) {
        return null;
      }

      if (legacy.packageManager && typeof legacy.packageManager === 'string'
          && legacy.packageManager !== 'default') {
        return legacy.packageManager;
      }
    }
  }

  return null;
}

export async function getSchematicDefaults(
  collection: string,
  schematic: string,
  project?: string | null,
): Promise<{}> {
  let result = {};
  const fullName = `${collection}:${schematic}`;

  let workspace = await getWorkspace('global');
  if (workspace && workspace.getSchematics()) {
    const schematicObject = workspace.getSchematics()[fullName];
    if (schematicObject) {
      result = { ...result, ...(schematicObject as {}) };
    }
    const collectionObject = workspace.getSchematics()[collection];
    if (typeof collectionObject == 'object' && !Array.isArray(collectionObject)) {
      result = { ...result, ...(collectionObject[schematic] as {}) };
    }

  }

  workspace = await getWorkspace('local');

  if (workspace) {
    if (workspace.getSchematics()) {
      const schematicObject = workspace.getSchematics()[fullName];
      if (schematicObject) {
        result = { ...result, ...(schematicObject as {}) };
      }
      const collectionObject = workspace.getSchematics()[collection];
      if (typeof collectionObject == 'object' && !Array.isArray(collectionObject)) {
        result = { ...result, ...(collectionObject[schematic] as {}) };
      }
    }

    project = project || getProjectByCwd(workspace);
    if (project && workspace.getProjectSchematics(project)) {
      const schematicObject = workspace.getProjectSchematics(project)[fullName];
      if (schematicObject) {
        result = { ...result, ...(schematicObject as {}) };
      }
      const collectionObject = workspace.getProjectSchematics(project)[collection];
      if (typeof collectionObject == 'object' && !Array.isArray(collectionObject)) {
        result = { ...result, ...(collectionObject[schematic] as {}) };
      }
    }
  }

  return result;
}

export async function isWarningEnabled(warning: string): Promise<boolean> {
  let workspace = await getWorkspace('local');

  if (workspace) {
    const project = getProjectByCwd(workspace);
    if (project && workspace.getProjectCli(project)) {
      const warnings = workspace.getProjectCli(project)['warnings'];
      if (typeof warnings == 'object' && !Array.isArray(warnings)) {
        const value = warnings[warning];
        if (typeof value == 'boolean') {
          return value;
        }
      }
    }
    if (workspace.getCli()) {
      const warnings = workspace.getCli()['warnings'];
      if (typeof warnings == 'object' && !Array.isArray(warnings)) {
        const value = warnings[warning];
        if (typeof value == 'boolean') {
          return value;
        }
      }
    }
  }

  workspace = await getWorkspace('global');
  if (workspace && workspace.getCli()) {
    const warnings = workspace.getCli()['warnings'];
    if (typeof warnings == 'object' && !Array.isArray(warnings)) {
      const value = warnings[warning];
      if (typeof value == 'boolean') {
        return value;
      }
    }
  }

  return true;
}
