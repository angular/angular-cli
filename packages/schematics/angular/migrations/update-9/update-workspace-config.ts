/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {
  JsonAstObject,
  JsonParseMode,
  parseJsonAst,
} from '@angular-devkit/core';
import { Rule, Tree, UpdateRecorder } from '@angular-devkit/schematics';
import {
  findPropertyInAstObject,
  insertPropertyInAstObjectInOrder,
  removePropertyInAstObject,
} from '../../utility/json-utils';

export function UpdateWorkspaceConfig(): Rule {
  return (tree: Tree) => {
    let workspaceConfigPath = 'angular.json';
    let angularConfigContent = tree.read(workspaceConfigPath);

    if (!angularConfigContent) {
      workspaceConfigPath = '.angular.json';
      angularConfigContent = tree.read(workspaceConfigPath);

      if (!angularConfigContent) {
        return;
      }
    }

    const angularJson = parseJsonAst(angularConfigContent.toString(), JsonParseMode.Loose);
    if (angularJson.kind !== 'object') {
      return;
    }

    const projects = findPropertyInAstObject(angularJson, 'projects');
    if (!projects || projects.kind !== 'object') {
      return;
    }

    // For all projects
    const recorder = tree.beginUpdate(workspaceConfigPath);
    for (const project of projects.properties) {
      const projectConfig = project.value;
      if (projectConfig.kind !== 'object') {
        break;
      }

      const architect = findPropertyInAstObject(projectConfig, 'architect');
      if (!architect || architect.kind !== 'object') {
        break;
      }

      const buildTarget = findPropertyInAstObject(architect, 'build');
      if (buildTarget && buildTarget.kind === 'object') {
        const builder = findPropertyInAstObject(buildTarget, 'builder');
        // Projects who's build builder is not build-angular:browser
        if (builder && builder.kind === 'string' && builder.value === '@angular-devkit/build-angular:browser') {
          updateOption('styles', recorder, buildTarget);
          updateOption('scripts', recorder, buildTarget);
        }
      }

      const testTarget = findPropertyInAstObject(architect, 'test');
      if (testTarget && testTarget.kind === 'object') {
        const builder = findPropertyInAstObject(testTarget, 'builder');
        // Projects who's build builder is not build-angular:browser
        if (builder && builder.kind === 'string' && builder.value === '@angular-devkit/build-angular:karma') {
          updateOption('styles', recorder, testTarget);
          updateOption('scripts', recorder, testTarget);
        }
      }
    }

    tree.commitUpdate(recorder);

    return tree;
  };
}

/**
 * Helper to retreive all the options in various configurations
 */
function getAllOptions(builderConfig: JsonAstObject): JsonAstObject[] {
  const options = [];
  const configurations = findPropertyInAstObject(builderConfig, 'configurations');
  if (configurations && configurations.kind === 'object') {
    options.push(...configurations.properties.map(x => x.value));
  }

  options.push(findPropertyInAstObject(builderConfig, 'options'));

  return options.filter(o => o && o.kind === 'object') as JsonAstObject[];
}

function updateOption(property: 'scripts' | 'styles', recorder: UpdateRecorder, builderConfig: JsonAstObject) {
  const options = getAllOptions(builderConfig);

  for (const option of options) {
    const propertyOption = findPropertyInAstObject(option, property);
    if (!propertyOption || propertyOption.kind !== 'array') {
      continue;
    }

    for (const node of propertyOption.elements) {
      if (!node || node.kind !== 'object') {
        // skip non complex objects
        continue;
      }

      const lazy = findPropertyInAstObject(node, 'lazy');
      removePropertyInAstObject(recorder, node, 'lazy');

      // if lazy was not true, it is redundant hence, don't add it
      if (lazy && lazy.kind === 'true') {
        insertPropertyInAstObjectInOrder(recorder, node, 'inject', false, 0);
      }
    }
  }
}
