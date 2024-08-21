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
 * This schematic migration performs updates to the Angular workspace configuration
 * to ensure that application projects are properly configured with polyfills
 * required for internationalization (`localize`).
 *
 * It specifically targets application projects that use either the `application`
 * or `browser-esbuild` builders.
 *
 * The migration process involves:
 *
 * 1. Iterating over all projects in the workspace.
 * 2. Checking each project to determine if it is an application-type project.
 * 3. For each application project, examining the associated build targets.
 * 4. If a build target's `localize` option is enabled but the polyfill
 *    `@angular/localize/init` is missing from the `polyfills` array, the polyfill
 *    is automatically added to ensure proper internationalization support.
 *
 * Additionally, this migration updates projects that use the `dev-server` or `extract-i18n`
 * builders to ensure that deprecated `browserTarget` options are migrated to the
 * newer `buildTarget` field.
 *
 */
export default function (): Rule {
  return updateWorkspace((workspace) => {
    for (const project of workspace.projects.values()) {
      if (project.extensions.projectType !== ProjectType.Application) {
        continue;
      }

      for (const target of project.targets.values()) {
        if (target.builder === Builders.DevServer || target.builder === Builders.ExtractI18n) {
          // Migrate `browserTarget` to `buildTarget`

          for (const [, options] of allTargetOptions(target, false)) {
            if (options['browserTarget'] && !options['buildTarget']) {
              options['buildTarget'] = options['browserTarget'];
            }

            delete options['browserTarget'];
          }
        }

        // Check if the target uses application-related builders
        if (
          target.builder !== Builders.BuildApplication &&
          target.builder !== Builders.Application &&
          target.builder !== Builders.BrowserEsbuild
        ) {
          continue;
        }

        // Check if polyfills include '@angular/localize/init'
        const polyfills = target.options?.['polyfills'];
        if (
          Array.isArray(polyfills) &&
          polyfills.some(
            (polyfill) => typeof polyfill === 'string' && polyfill.startsWith('@angular/localize'),
          )
        ) {
          // Skip if the polyfill is already present
          continue;
        }

        // Add '@angular/localize/init' polyfill if localize option is enabled
        for (const [, options] of allTargetOptions(target, false)) {
          if (options['localize']) {
            target.options ??= {};
            ((target.options['polyfills'] ??= []) as string[]).push('@angular/localize/init');
            break;
          }
        }
      }
    }
  });
}
