import * as path from 'path';
import { findUp } from './find-up';

// devkit/local bridge types and imports.
import {
  JsonAstObject as JsonAstObjectT,
  JsonValue as JsonValueT,
  experimental as experimentalT,
} from '@angular-devkit/core';
import { core, coreNode } from '../utilities/devkit-local-bridge';
const { NodeJsSyncHost } = coreNode;
const { JsonParseMode, experimental, normalize, parseJsonAst, virtualFs } = core;


function getSchemaLocation(): string {
  const packagePath = require.resolve('@angular-devkit/core/package.json');

  return path.join(path.dirname(packagePath), 'src/workspace/workspace-schema.json');
}

export const workspaceSchemaPath = getSchemaLocation();

function configFilePath(projectPath?: string): string | null {
  const configNames = [ 'angular.json', '.angular.json' ];
  // Find the configuration, either where specified, in the Angular CLI project
  // (if it's in node_modules) or from the current process.
  return (projectPath && findUp(configNames, projectPath))
      || findUp(configNames, process.cwd())
      || findUp(configNames, __dirname);
}

let cachedWorkspace: experimentalT.workspace.Workspace | null | undefined = undefined;
export function getWorkspace(): experimentalT.workspace.Workspace | null {
  if (cachedWorkspace != undefined) {
    return cachedWorkspace;
  }

  const configPath = configFilePath();

  if (!configPath) {
    cachedWorkspace = null;
    return null;
  }

  const root = path.dirname(configPath);
  const workspace = new experimental.workspace.Workspace(
    normalize(root),
    new NodeJsSyncHost(),
  );

  workspace.loadWorkspaceFromHost(normalize(path.basename(configPath))).subscribe();
  cachedWorkspace = workspace;
  return workspace;
}

export function getWorkspaceRaw(): [JsonAstObjectT | null, string] {
  const configPath = configFilePath();

  if (!configPath) {
    return null;
  }

  let content;
  new NodeJsSyncHost().read(normalize(configPath))
    .subscribe(data => content = virtualFs.fileBufferToString(data));

  const ast = parseJsonAst(content, JsonParseMode.Loose);

  if (ast.kind != 'object') {
    throw new Error('Invalid JSON');
  }
  return [ast as JsonAstObjectT, configPath];
}

export function validateWorkspace(json: JsonValueT) {
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

export function getPackageManager(): string {
  const workspace = getWorkspace();
  if (workspace && workspace.getCli()) {
    const value = workspace.getCli()['packageManager'];
    if (typeof value == 'string') {
      return value;
    }
  }
  return 'npm';
}

export function getDefaultSchematicCollection(): string {
  const workspace = getWorkspace();
  if (workspace && workspace.getSchematics()) {
    const value = workspace.getSchematics()['defaultCollection'];
    if (typeof value == 'string') {
      return value;
    }
  }

  return '@schematics/angular';
}

export function isWarningEnabled(warning: string): boolean {
  const workspace = getWorkspace();
  if (workspace && workspace.getCli()) {
    const warnings = workspace.getCli()['warnings'];
    if (typeof warnings == 'object' && !Array.isArray(warnings)) {
      const value = warnings[warning];
      if (value === false) {
        return false;
      }
    }
  }

  return true;
}
