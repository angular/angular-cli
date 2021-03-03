/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { JsonValue, workspaces } from '@angular-devkit/core';
import { Rule } from '@angular-devkit/schematics';
import { allTargetOptions, allWorkspaceTargets, updateWorkspace } from '../../utility/workspace';

type BuilderOptionsType = Readonly<[optionName: string, oldDefault: JsonValue | undefined, newDefault: JsonValue | undefined][]>;

const BrowserBuilderOptions: BuilderOptionsType = [
  ['aot', false, true],
  ['vendorChunk', true, false],
  ['extractLicenses', true, false],
  ['buildOptimizer', false, true],
  ['sourceMap', true, false],
  ['optimization', false, true],
  ['namedChunks', false, true],
  ['outputHashing', 'none', 'all'],
];

const ServerBuilderOptions: BuilderOptionsType = [
  ['sourceMap', true, false],
  ['optimization', false, true],
  ['outputHashing', 'none', 'media'],
];

export default function (): Rule {
  return updateWorkspace(workspace => {
    for (const [, target] of allWorkspaceTargets(workspace)) {
      // Only interested in Angular Devkit broweser and server builders
      if (target?.builder === '@angular-devkit/build-angular:server') {
        updateOptions(target, ServerBuilderOptions);
      } else if (target?.builder === '@angular-devkit/build-angular:browser') {
        updateOptions(target, BrowserBuilderOptions);

        for (const [, options] of allTargetOptions(target)) {
          delete options.experimentalRollupPass;
        }
      }
    }
  });
}

function updateOptions(
  target: workspaces.TargetDefinition, optionsToUpdate: typeof ServerBuilderOptions | typeof BrowserBuilderOptions,
): void {
  if (!target.options) {
    target.options = {};
  }

  const configurationOptions = target.configurations && Object.values(target.configurations);

  for (const [optionName, oldDefault, newDefault] of optionsToUpdate) {
    let value = target.options[optionName];
    if (value === newDefault) {
      // Value is same as new default
      delete target.options[optionName];
    } else if (value === undefined) {
      // Value is not defined, hence the default in the builder was used.
      target.options[optionName] = oldDefault;
      value = oldDefault;
    }

    // Remove overrides in configurations which are no longer needed.
    configurationOptions?.filter(o => o && o[optionName] === value)
      .forEach(o => o && delete o[optionName]);
  }
}
