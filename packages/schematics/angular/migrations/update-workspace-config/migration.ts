/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { Rule } from '@angular-devkit/schematics';
import { allTargetOptions, updateWorkspace } from '../../utility/workspace';
import { Builders, ProjectType } from '../../utility/workspace-models';

/**
 * Main entry point for the migration rule.
 *
 * This migration performs the following tasks:
 * - Loops through all application projects in the workspace.
 * - Identifies the build target for each application.
 * - If the `localize` option is enabled but the polyfill `@angular/localize/init` is not present,
 *   it adds the polyfill to the `polyfills` option of the build target.
 *
 * This migration is specifically for application projects that use either the `application` or `browser-esbuild` builders.
 */
export default function (): Rule {
  return updateWorkspace((workspace) => {
    for (const project of workspace.projects.values()) {
      if (project.extensions.projectType !== ProjectType.Application) {
        continue;
      }

      const buildTarget = project.targets.get('build');
      if (
        !buildTarget ||
        (buildTarget.builder !== Builders.BuildApplication &&
          buildTarget.builder !== Builders.Application &&
          buildTarget.builder !== Builders.BrowserEsbuild)
      ) {
        continue;
      }

      const polyfills = buildTarget.options?.['polyfills'];
      if (
        Array.isArray(polyfills) &&
        polyfills.some(
          (polyfill) => typeof polyfill === 'string' && polyfill.startsWith('@angular/localize'),
        )
      ) {
        // Skip the polyfill is already added
        continue;
      }

      for (const [, options] of allTargetOptions(buildTarget, false)) {
        if (options['localize']) {
          buildTarget.options ??= {};
          ((buildTarget.options['polyfills'] ??= []) as string[]).push('@angular/localize/init');
          break;
        }
      }
    }
  });
}
