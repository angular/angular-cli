/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { JsonValue, tags, workspaces } from '@angular-devkit/core';
import { Rule } from '@angular-devkit/schematics';
import { allTargetOptions, allWorkspaceTargets, updateWorkspace } from '../../utility/workspace';

type BuilderOptionsType = Readonly<
  [optionName: string, oldDefault: JsonValue | undefined, newDefault: JsonValue | undefined][]
>;

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
  return (_tree, context) =>
    updateWorkspace((workspace) => {
      for (const [targetName, target, projectName] of allWorkspaceTargets(workspace)) {
        if (
          !target.builder.startsWith('@angular-devkit/') &&
          !target.builder.startsWith('@nguniversal/')
        ) {
          context.logger.warn(tags.stripIndent`
            "${targetName}" target in "${projectName}" project is using a third-party builder.
            You may need to adjust the options to retain the existing behavior.
            For more information, see the breaking changes section within the release notes: https://github.com/angular/angular-cli/releases/tag/v12.0.0
          `);

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
  target: workspaces.TargetDefinition,
  optionsToUpdate: typeof ServerBuilderOptions | typeof BrowserBuilderOptions,
): void {
  // This is a hacky way to make this migration idempotent.
  // `defaultConfiguration` was only introduced in v12 projects and hence v11 projects do not have this property.
  // Setting it as an empty string will not cause any side-effect.
  if (typeof target.defaultConfiguration === 'string') {
    return;
  }

  target.defaultConfiguration = '';

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
    configurationOptions
      ?.filter((o) => o && o[optionName] === value)
      .forEach((o) => o && delete o[optionName]);
  }
}
