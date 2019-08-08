/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { JsonAstObject } from '@angular-devkit/core';
import { Rule, Tree, UpdateRecorder } from '@angular-devkit/schematics';
import { getWorkspacePath } from '../../utility/config';
import {
  appendValueInAstArray,
  findPropertyInAstObject,
  insertPropertyInAstObjectInOrder,
  removePropertyInAstObject,
} from '../../utility/json-utils';
import { Builders } from '../../utility/workspace-models';
import { getAllOptions, getTargets, getWorkspace } from './utils';

export const ANY_COMPONENT_STYLE_BUDGET = {
  type: 'anyComponentStyle',
  maximumWarning: '6kb',
};

export function UpdateWorkspaceConfig(): Rule {
  return (tree: Tree) => {
    const workspacePath = getWorkspacePath(tree);
    const workspace = getWorkspace(tree);
    const recorder = tree.beginUpdate(workspacePath);

    for (const { target } of getTargets(workspace, 'build', Builders.Browser)) {
      updateStyleOrScriptOption('styles', recorder, target);
      updateStyleOrScriptOption('scripts', recorder, target);
      addAnyComponentStyleBudget(recorder, target);
    }

    for (const { target } of getTargets(workspace, 'test', Builders.Karma)) {
      updateStyleOrScriptOption('styles', recorder, target);
      updateStyleOrScriptOption('scripts', recorder, target);
    }

    tree.commitUpdate(recorder);

    return tree;
  };
}

function updateStyleOrScriptOption(property: 'scripts' | 'styles', recorder: UpdateRecorder, builderConfig: JsonAstObject) {
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

function addAnyComponentStyleBudget(recorder: UpdateRecorder, builderConfig: JsonAstObject) {
  const options = getAllOptions(builderConfig, true);

  for (const option of options) {
    const aotOption = findPropertyInAstObject(option, 'aot');
    if (!aotOption || aotOption.kind !== 'true') {
      // AnyComponentStyle only works for AOT
      continue;
    }

    const budgetOption = findPropertyInAstObject(option, 'budgets');
    if (!budgetOption) {
      // add
      insertPropertyInAstObjectInOrder(recorder, option, 'budgets', [ANY_COMPONENT_STYLE_BUDGET], 14);
      continue;
    }

    if (budgetOption.kind !== 'array') {
      continue;
    }

    // if 'anyComponentStyle' budget already exists don't add.
    const hasAnyComponentStyle = budgetOption.elements.some(node => {
      if (!node || node.kind !== 'object') {
        // skip non complex objects
        return false;
      }

      const budget = findPropertyInAstObject(node, 'type');

      return !!budget && budget.kind === 'string' && budget.value === 'anyComponentStyle';
    });

    if (!hasAnyComponentStyle) {
      appendValueInAstArray(recorder, budgetOption, ANY_COMPONENT_STYLE_BUDGET, 16);
    }
  }
}
