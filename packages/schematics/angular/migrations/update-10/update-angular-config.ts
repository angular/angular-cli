/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { workspaces } from '@angular-devkit/core';
import { Rule } from '@angular-devkit/schematics';
import { updateWorkspace } from '../../utility/workspace';
import { Builders, ProjectType } from '../../utility/workspace-models';

export default function (): Rule {
  return updateWorkspace(workspace => {
    for (const [, project] of workspace.projects) {
      if (project.extensions.projectType !== ProjectType.Application) {
        // Only interested in application projects since these changes only effects application builders
        continue;
      }

      for (const [, target] of project.targets) {
        // Only interested in Angular Devkit builders
        if (!target?.builder.startsWith('@angular-devkit/build-angular')) {
          continue;
        }

        let extraOptionsToRemove = {};
        if (target.builder === Builders.Server) {
          extraOptionsToRemove = {
            vendorChunk: undefined,
            commonChunk: undefined,
          };
        }

        // Check options
        if (target.options) {
          target.options = {
            ...updateVendorSourceMap(target.options),
            evalSourceMap: undefined,
            skipAppShell: undefined,
            profile: undefined,
            ...extraOptionsToRemove,
          };
        }

        // Go through each configuration entry
        if (!target.configurations) {
          continue;
        }

        for (const configurationName of Object.keys(target.configurations)) {
          target.configurations[configurationName] = {
            ...updateVendorSourceMap(target.configurations[configurationName]),
            evalSourceMap: undefined,
            skipAppShell: undefined,
            profile: undefined,
            ...extraOptionsToRemove,
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
