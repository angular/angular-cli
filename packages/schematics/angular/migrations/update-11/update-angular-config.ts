/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { JsonArray, isJsonArray, isJsonObject, workspaces } from '@angular-devkit/core';
import { Rule } from '@angular-devkit/schematics';
import { updateWorkspace } from '../../utility/workspace';

export default function (): Rule {
  return updateWorkspace((workspace) => {
    const optionsToRemove: Record<string, undefined> = {
      environment: undefined,
      extractCss: undefined,
      tsconfigFileName: undefined,
      rebaseRootRelativeCssUrls: undefined,
    };

    for (const [, project] of workspace.projects) {
      for (const [, target] of project.targets) {
        // Only interested in Angular Devkit builders
        if (!target?.builder.startsWith('@angular-devkit/build-angular')) {
          continue;
        }

        // Check options
        if (target.options) {
          target.options = {
            ...updateLazyScriptsStyleOption(target.options),
            ...optionsToRemove,
          };
        }

        // Go through each configuration entry
        if (!target.configurations) {
          continue;
        }

        for (const configurationName of Object.keys(target.configurations)) {
          target.configurations[configurationName] = {
            ...updateLazyScriptsStyleOption(target.configurations[configurationName]),
            ...optionsToRemove,
          };
        }
      }
    }
  });
}

type TargetOptions = workspaces.TargetDefinition['options'];

function updateLazyScriptsStyleOption(options: TargetOptions): TargetOptions {
  function visitor(
    options: NonNullable<TargetOptions>,
    type: 'scripts' | 'styles',
  ): JsonArray | undefined {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    if (!options[type] || !isJsonArray(options[type]!)) {
      return undefined;
    }
    const entries = [];
    for (const entry of options[type] as JsonArray) {
      if (isJsonObject(entry) && 'lazy' in entry) {
        entries.push({
          ...entry,
          inject: !entry.lazy,
          lazy: undefined,
        });
      } else {
        entries.push(entry);
      }
    }

    return entries as JsonArray;
  }

  if (!options) {
    return undefined;
  }

  return {
    ...options,
    styles: visitor(options, 'styles'),
    scripts: visitor(options, 'scripts'),
  };
}
