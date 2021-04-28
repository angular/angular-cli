/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { JsonObject, JsonValue, isJsonObject, workspaces } from '@angular-devkit/core';
import { Rule } from '@angular-devkit/schematics';
import { updateWorkspace } from '../../utility/workspace';
import { Builders, ProjectType } from '../../utility/workspace-models';

export default function (): Rule {
  return updateWorkspace((workspace) => {
    // Remove deprecated CLI root level options
    removeDeprecatedCLIOptions(workspace.extensions);

    for (const [, project] of workspace.projects) {
      // Project level
      removeDeprecatedCLIOptions(project.extensions);

      if (project.extensions.projectType !== ProjectType.Application) {
        // Only interested in application projects since these changes only effects application builders
        continue;
      }

      for (const [, target] of project.targets) {
        // Only interested in Angular Devkit builders
        if (!target?.builder.startsWith('@angular-devkit/build-angular')) {
          continue;
        }

        let optionsToRemove: Record<string, undefined> = {
          evalSourceMap: undefined,
          skipAppShell: undefined,
          profile: undefined,
          elementExplorer: undefined,
        };

        if (target.builder === Builders.Server) {
          optionsToRemove = {
            ...optionsToRemove,
            vendorChunk: undefined,
            commonChunk: undefined,
          };
        }

        // Check options
        if (target.options) {
          target.options = {
            ...updateVendorSourceMap(target.options),
            ...optionsToRemove,
          };
        }

        // Go through each configuration entry
        if (!target.configurations) {
          continue;
        }

        for (const configurationName of Object.keys(target.configurations)) {
          target.configurations[configurationName] = {
            ...updateVendorSourceMap(target.configurations[configurationName]),
            ...optionsToRemove,
          };
        }
      }
    }
  });
}

type TargetOptions = workspaces.TargetDefinition['options'];

function updateVendorSourceMap(options: TargetOptions): TargetOptions {
  if (!options) {
    return {};
  }

  const { vendorSourceMap: vendor, sourceMap = true } = options;

  if (vendor === undefined) {
    return options;
  }

  if (sourceMap === true) {
    return {
      ...options,
      sourceMap: {
        styles: true,
        scripts: true,
        vendor,
      },
      vendorSourceMap: undefined,
    };
  }

  if (typeof sourceMap === 'object') {
    return {
      ...options,
      sourceMap: {
        ...sourceMap,
        vendor,
      },
      vendorSourceMap: undefined,
    };
  }

  return {
    ...options,
    vendorSourceMap: undefined,
  };
}

function removeDeprecatedCLIOptions(extensions: Record<string, JsonValue | undefined>) {
  const cliOptions = extensions?.cli;
  if (cliOptions && isJsonObject(cliOptions) && isJsonObject(cliOptions.warnings)) {
    (cliOptions.warnings as Partial<JsonObject>) = {
      ...cliOptions.warnings,
      typescriptMismatch: undefined,
    };
  }
}
