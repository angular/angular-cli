/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { workspaces } from '@angular-devkit/core';
import { Rule, Tree } from '@angular-devkit/schematics';
import { allTargetOptions, allWorkspaceTargets, updateWorkspace } from '../../utility/workspace';
import { Builders } from '../../utility/workspace-models';
import { isIvyEnabled } from './utils';

export const ANY_COMPONENT_STYLE_BUDGET = {
  type: 'anyComponentStyle',
  maximumWarning: '6kb',
};

export function updateWorkspaceConfig(): Rule {
  return (tree) =>
    updateWorkspace((workspace) => {
      for (const [targetName, target] of allWorkspaceTargets(workspace)) {
        switch (targetName) {
          case 'build':
            if (target.builder !== Builders.Browser) {
              break;
            }
            updateStyleOrScriptOption('styles', target);
            updateStyleOrScriptOption('scripts', target);
            addAnyComponentStyleBudget(target);
            updateAotOption(tree, target);
            break;
          case 'test':
            if (target.builder !== Builders.Karma) {
              break;
            }
            updateStyleOrScriptOption('styles', target);
            updateStyleOrScriptOption('scripts', target);
            break;
          case 'server':
            if (target.builder !== Builders.Server) {
              break;
            }
            updateOptimizationOption(target);
            break;
        }
      }
    });
}

function updateAotOption(tree: Tree, builderConfig: workspaces.TargetDefinition) {
  if (!builderConfig.options) {
    return;
  }

  const tsConfig = builderConfig.options.tsConfig;
  // Do not add aot option if the users already opted out from Ivy
  if (tsConfig && typeof tsConfig === 'string' && !isIvyEnabled(tree, tsConfig)) {
    return;
  }

  // Add aot to options
  const aotOption = builderConfig.options.aot;
  if (aotOption === undefined || aotOption === false) {
    builderConfig.options.aot = true;
  }

  if (!builderConfig.configurations) {
    return;
  }

  for (const configurationOptions of Object.values(builderConfig.configurations)) {
    delete configurationOptions?.aot;
  }
}

function updateStyleOrScriptOption(
  property: 'scripts' | 'styles',
  builderConfig: workspaces.TargetDefinition,
) {
  for (const [, options] of allTargetOptions(builderConfig)) {
    const propertyOption = options[property];
    if (!propertyOption || !Array.isArray(propertyOption)) {
      continue;
    }

    for (const node of propertyOption) {
      if (!node || typeof node !== 'object' || Array.isArray(node)) {
        // skip non complex objects
        continue;
      }

      const lazy = node.lazy;
      if (lazy !== undefined) {
        delete node.lazy;

        // if lazy was not true, it is redundant hence, don't add it
        if (lazy) {
          node.inject = false;
        }
      }
    }
  }
}

function addAnyComponentStyleBudget(builderConfig: workspaces.TargetDefinition) {
  for (const [, options] of allTargetOptions(builderConfig, /* skipBaseOptions */ true)) {
    if (options.budgets === undefined) {
      options.budgets = [ANY_COMPONENT_STYLE_BUDGET];
      continue;
    }

    if (!Array.isArray(options.budgets)) {
      continue;
    }

    // If 'anyComponentStyle' budget already exists, don't add
    const hasAnyComponentStyle = options.budgets.some((node) => {
      if (!node || typeof node !== 'object' || Array.isArray(node)) {
        // skip non complex objects
        return false;
      }

      return node.type === 'anyComponentStyle';
    });

    if (!hasAnyComponentStyle) {
      options.budgets.push(ANY_COMPONENT_STYLE_BUDGET);
    }
  }
}

function updateOptimizationOption(builderConfig: workspaces.TargetDefinition) {
  for (const [, options] of allTargetOptions(builderConfig, /* skipBaseOptions */ true)) {
    if (options.optimization !== true) {
      options.optimization = true;
    }
  }
}
