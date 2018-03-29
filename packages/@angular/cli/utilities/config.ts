import { existsSync, writeFileSync } from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  JsonAstObject,
  JsonParseMode,
  JsonValue,
  experimental,
  normalize,
  parseJsonAst,
  virtualFs,
} from '@angular-devkit/core';
import { NodeJsSyncHost } from '@angular-devkit/core/node';
import { findUp } from './find-up';

function getSchemaLocation(): string {
  const packagePath = require.resolve('@angular-devkit/core/package.json');

  return path.join(path.dirname(packagePath), 'src/workspace/workspace-schema.json');
}

export const workspaceSchemaPath = getSchemaLocation();

const configNames = [ 'angular.json', '.angular.json' ];

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

  for (const name of configNames) {
    const p = path.join(home, name);
    if (existsSync(p)) {
      return p;
    }
  }

  return null;
}

const cachedWorkspaces = new Map<string, experimental.workspace.Workspace | null>();

export function getWorkspace(
  level: 'local' | 'global' = 'local',
): experimental.workspace.Workspace | null {
  const cached = cachedWorkspaces.get(level);
  if (cached != undefined) {
    return cached;
  }

  let configPath = level === 'local' ? projectFilePath() : globalFilePath();

  if (!configPath) {
    if (level === 'global') {
      configPath = createGlobalSettings();
    } else {
      cachedWorkspaces.set(level, null);
      return null;
    }
  }

  const root = normalize(path.dirname(configPath));
  const file = normalize(path.basename(configPath));
  const workspace = new experimental.workspace.Workspace(
    root,
    new NodeJsSyncHost(),
  );

  workspace.loadWorkspaceFromHost(file).subscribe();
  cachedWorkspaces.set(level, workspace);
  return workspace;
}

function createGlobalSettings(): string {
  const home = os.homedir();
  if (!home) {
    throw new Error('No home directory found.');
  }

  const globalPath = path.join(home, configNames[1]);
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

  let content;
  new NodeJsSyncHost().read(normalize(configPath))
    .subscribe(data => content = virtualFs.fileBufferToString(data));

  const ast = parseJsonAst(content, JsonParseMode.Loose);

  if (ast.kind != 'object') {
    throw new Error('Invalid JSON');
  }
  return [ast as JsonAstObject, configPath];
}

export function validateWorkspace(json: JsonValue) {
  const workspace = new experimental.workspace.Workspace(
    normalize('.'),
    new NodeJsSyncHost(),
  );

  let error;
  workspace.loadWorkspaceFromJson(json).subscribe({
    error: e => error = e,
  });

  if (error) {
    throw error;
  }

  return true;
}

export function getProjectByCwd(_workspace: experimental.workspace.Workspace): string | null {
  // const cwd = process.cwd();
  // TOOD: Implement project location logic
  return null;
}

export function getPackageManager(): string {
  let workspace = getWorkspace();

  if (workspace) {
    const project = getProjectByCwd(workspace);
    if (project && workspace.getProjectCli(project)) {
      const value = workspace.getProjectCli(project)['packageManager'];
      if (typeof value == 'string') {
        return value;
      }
    } else if (workspace.getCli()) {
      const value = workspace.getCli()['packageManager'];
      if (typeof value == 'string') {
        return value;
      }
    }
  }

  workspace = getWorkspace('global');
  if (workspace && workspace.getCli()) {
    const value = workspace.getCli()['packageManager'];
    if (typeof value == 'string') {
      return value;
    }
  }

  return 'npm';
}

export function getDefaultSchematicCollection(): string {
  let workspace = getWorkspace('local');

  if (workspace) {
    const project = getProjectByCwd(workspace);
    if (project && workspace.getProjectCli(project)) {
      const value = workspace.getProjectCli(project)['defaultCollection'];
      if (typeof value == 'string') {
        return value;
      }
    } else if (workspace.getCli()) {
      const value = workspace.getCli()['defaultCollection'];
      if (typeof value == 'string') {
        return value;
      }
    }
  }

  workspace = getWorkspace('global');
  if (workspace && workspace.getCli()) {
    const value = workspace.getCli()['defaultCollection'];
    if (typeof value == 'string') {
      return value;
    }
  }

  return '@schematics/angular';
}

export function getSchematicDefaults(collection: string, schematic: string, project?: string): {} {
  let result = {};

  let workspace = getWorkspace('global');
  if (workspace && workspace.getSchematics()) {
    const collectionObject = workspace.getSchematics()[collection];
    if (typeof collectionObject == 'object' && !Array.isArray(collectionObject)) {
      result = collectionObject[schematic] || {};
    }
  }

  workspace = getWorkspace('local');

  if (workspace) {
    if (workspace.getSchematics()) {
      const collectionObject = workspace.getSchematics()[collection];
      if (typeof collectionObject == 'object' && !Array.isArray(collectionObject)) {
        result = { ...result, ...(collectionObject[schematic] as {}) };
      }
    }

    project = project || getProjectByCwd(workspace);
    if (project && workspace.getProjectSchematics(project)) {
      const collectionObject = workspace.getProjectSchematics(project)[collection];
      if (typeof collectionObject == 'object' && !Array.isArray(collectionObject)) {
        result = { ...result, ...(collectionObject[schematic] as {}) };
      }
    }
  }

  return result;
}

export function isWarningEnabled(warning: string): boolean {
  let workspace = getWorkspace('local');

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
    } else if (workspace.getCli()) {
      const warnings = workspace.getCli()['warnings'];
      if (typeof warnings == 'object' && !Array.isArray(warnings)) {
        const value = warnings[warning];
        if (typeof value == 'boolean') {
          return value;
        }
      }
    }
  }

  workspace = getWorkspace('global');
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
