/**
 * @license
 * Copyright Google LLC All Rights Reserved.
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
  ['extractLicenses', false, true],
  ['buildOptimizer', false, true],
  ['sourceMap', true, false],
  ['optimization', false, true],
  ['namedChunks', true, false],
];

const ServerBuilderOptions: BuilderOptionsType = [
  ['sourceMap', true, false],
  ['optimization', false, true],
];

export default function (): Rule {
  return updateWorkspace(workspace => {
    for (const [, target] of allWorkspaceTargets(workspace)) {
      if (!target?.builder.startsWith('@angular-devkit/build-angular')) {
        continue;
      }

      // Only interested in Angular Devkit browser and server builders
      switch (target.builder) {
        case '@angular-devkit/build-angular:server':
          updateOptions(target, ServerBuilderOptions);
          break;
        case '@angular-devkit/build-angular:browser':
          updateOptions(target, BrowserBuilderOptions);
          break;
      }

      for (const [, options] of allTargetOptions(target)) {
        delete options.experimentalRollupPass;
        delete options.lazyModules;
        delete options.forkTypeChecker;
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
