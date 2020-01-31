/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { JsonAstObject, JsonParseMode, dirname, normalize, parseJsonAst, resolve } from '@angular-devkit/core';
import { SchematicsException, Tree } from '@angular-devkit/schematics';
import { getWorkspacePath } from '../../utility/config';
import { findPropertyInAstObject } from '../../utility/json-utils';
import { Builders, WorkspaceTargets } from '../../utility/workspace-models';

/** Get a project target which builder and target names matches the provided. */
export function getProjectTarget(
  project: JsonAstObject,
  targetName: Exclude<keyof WorkspaceTargets, number>,
  builderName: Builders,
): JsonAstObject | undefined {
  const projectRoot = findPropertyInAstObject(project, 'root');
  if (!projectRoot || projectRoot.kind !== 'string') {
    return undefined;
  }

  const architect = findPropertyInAstObject(project, 'architect');
  if (!architect || architect.kind !== 'object') {
    return undefined;
  }

  const target = findPropertyInAstObject(architect, targetName);
  if (!target || target.kind !== 'object') {
    return undefined;
  }

  const builder = findPropertyInAstObject(target, 'builder');
  // Projects who's build builder is @angular-devkit/build-ng-packagr
  if (builder && builder.kind === 'string' && builder.value === builderName) {
    return target;
  }

  return undefined;
}

export function getTargets(
  workspace: JsonAstObject,
  targetName: Exclude<keyof WorkspaceTargets, number>,
  builderName: Builders,
): { target: JsonAstObject, project: JsonAstObject }[] {
  const projects = findPropertyInAstObject(workspace as JsonAstObject, 'projects');
  if (!projects || projects.kind !== 'object' || !projects.properties) {
    return [];
  }

  const targets = [];
  for (const project of projects.properties) {
    const projectConfig = project.value;
    if (projectConfig.kind !== 'object') {
      continue;
    }

    const target = getProjectTarget(projectConfig, targetName, builderName);
    if (target) {
      targets.push({ target, project: projectConfig });
    }
  }

  return targets;
}

/** Helper to retreive all the options in various configurations. */
export function getAllOptions(builderConfig: JsonAstObject, configurationsOnly = false): JsonAstObject[] {
  const options = [];
  const configurations = findPropertyInAstObject(builderConfig, 'configurations');
  if (configurations && configurations.kind === 'object') {
    options.push(...configurations.properties.map(x => x.value));
  }

  if (!configurationsOnly) {
    options.push(findPropertyInAstObject(builderConfig, 'options'));
  }

  return options.filter(o => o && o.kind === 'object') as JsonAstObject[];
}

export function getWorkspace(host: Tree): JsonAstObject {
  const path = getWorkspacePath(host);
  const content = readJsonFileAsAstObject(host, path);
  if (!content) {
    throw new SchematicsException(`Could not find (${path})`);
  }

  return content;
}

export function readJsonFileAsAstObject(host: Tree, path: string): JsonAstObject | undefined {
  const configBuffer = host.read(path);
  if (!configBuffer) {
    return undefined;
  }

  const content = configBuffer.toString();
  const astContent = parseJsonAst(content, JsonParseMode.Loose);
  if (!astContent || astContent.kind !== 'object') {
    throw new SchematicsException(`Invalid JSON AST Object (${path})`);
  }

  return astContent;
}

export function isIvyEnabled(tree: Tree, tsConfigPath: string): boolean {
  // In version 9, Ivy is turned on by default
  // Ivy is opted out only when 'enableIvy' is set to false.

  const buffer = tree.read(tsConfigPath);
  if (!buffer) {
    return true;
  }

  const tsCfgAst = parseJsonAst(buffer.toString(), JsonParseMode.Loose);

  if (tsCfgAst.kind !== 'object') {
    return true;
  }

  const ngCompilerOptions = findPropertyInAstObject(tsCfgAst, 'angularCompilerOptions');
  if (ngCompilerOptions && ngCompilerOptions.kind === 'object') {
    const enableIvy = findPropertyInAstObject(ngCompilerOptions, 'enableIvy');

    if (enableIvy) {
      return !!enableIvy.value;
    }
  }

  const configExtends = findPropertyInAstObject(tsCfgAst, 'extends');
  if (configExtends && configExtends.kind === 'string') {
    const extendedTsConfigPath = resolve(
      dirname(normalize(tsConfigPath)),
      normalize(configExtends.value),
    );

    return isIvyEnabled(tree, extendedTsConfigPath);
  }

  return true;
}

// TS represents paths internally with '/' and expects paths to be in this format.
// angular.json expects paths with '/', but doesn't enforce them.
export function forwardSlashPath(path: string) {
  return path.replace(/\\/g, '/');
}
